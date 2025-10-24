'use server';

import { z } from 'zod';
import { reportSchema } from '@/lib/definitions';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';

export type FormState = {
  success: boolean;
  message: string;
  errors?: {
    [key: string]: string[] | undefined;
  };
};

async function uploadFile(
  file: File,
  folder: string
): Promise<string | null> {
  if (!file || file.size === 0) return null;

  const bucket = adminStorage.bucket();
  const uniqueId = Date.now();
  const filePath = `error_reports/${folder}/${uniqueId}_${file.name}`;
  const fileRef = bucket.file(filePath);

  const buffer = Buffer.from(await file.arrayBuffer());

  await fileRef.save(buffer, {
    metadata: {
      contentType: file.type,
    },
  });

  // Firebase Storage public URL format
  // Note: This requires your Storage rules to allow public reads.
  // A more secure method involves signed URLs if files are sensitive.
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
  
  return publicUrl;
}

export async function submitReport(
  prevState: FormState | null,
  formData: FormData
): Promise<FormState> {
  try {
    const validatedFields = reportSchema.safeParse({
      clientName: formData.get('clientName'),
      technicianName: formData.get('technicianName'),
      errorDate: formData.get('errorDate'),
      reportText: formData.get('reportText'),
      mediaFile: formData.get('mediaFile'),
      zipFile: formData.get('zipFile'),
      reportedByUserId: formData.get('reportedByUserId'),
    });

    if (!validatedFields.success) {
      return {
        success: false,
        message: 'Falha na validação. Verifique os campos.',
        errors: validatedFields.error.flatten().fieldErrors,
      };
    }

    const {
      clientName,
      technicianName,
      errorDate,
      reportText,
      mediaFile,
      zipFile,
      reportedByUserId,
    } = validatedFields.data;

    const mediaUrl = await uploadFile(mediaFile as File, 'midia');
    const zipUrl = await uploadFile(zipFile as File, 'banco_de_dados');

    const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
    if (!appId) {
      throw new Error('Firebase App ID is not configured.');
    }
    const reportsCollectionRef = adminDb.collection(
      `artifacts/${appId}/public/data/error_reports`
    );

    await reportsCollectionRef.add({
      clientName,
      technicianName,
      errorDate,
      reportText,
      mediaUrl: mediaUrl || null,
      zipUrl: zipUrl || null,
      reportedByUserId,
      generatedAt: FieldValue.serverTimestamp(),
    });

    revalidatePath('/');
    return {
      success: true,
      message: '✅ Relatório de erro enviado com sucesso!',
    };
  } catch (e: unknown) {
    const error = e as Error;
    console.error('Erro ao enviar relatório:', error);
    return {
      success: false,
      message: `Falha ao enviar o relatório. Erro: ${error.message}`,
    };
  }
}
