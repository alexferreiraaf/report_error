import { z } from 'zod';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ACCEPTED_MEDIA_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];
const ACCEPTED_ZIP_TYPES = ["application/zip", "application/x-zip-compressed"];

const fileSchema = z
  .any()
  .refine((file) => file?.size, { message: 'Arquivo é obrigatório' })
  .refine((file) => file.size <= MAX_FILE_SIZE, `O tamanho máximo do arquivo é 100MB.`)
  .optional()
  .nullable();

export const reportSchema = z.object({
  clientName: z.string().min(1, 'Nome do cliente é obrigatório.'),
  technicianName: z.string().min(1, 'Nome do técnico é obrigatório.'),
  errorDate: z.string().min(1, 'Data do erro é obrigatória.'),
  reportText: z.string().min(1, 'O relatório detalhado é obrigatório.'),
  mediaFile: fileSchema.refine(
    (file) => !file || ACCEPTED_MEDIA_TYPES.includes(file.type),
    'Apenas formatos de imagem e vídeo são aceitos.'
  ),
  zipFile: fileSchema.refine(
    (file) => !file || ACCEPTED_ZIP_TYPES.includes(file.type),
    'Apenas arquivos .zip são aceitos.'
  ),
  reportedByUserId: z.string(),
});
