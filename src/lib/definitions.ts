import { z } from 'zod';

const MAX_FILE_SIZE_IN_BYTES = 1024 * 1024; // 1 MB
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

const fileSchema = z
  .any()
  .refine((file) => !file || file.size <= MAX_FILE_SIZE_IN_BYTES, {
      message: `O tamanho máximo do arquivo é 1MB.`
  })
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
  databaseSavedOnPC: z.enum(['sim', 'não'], {
    required_error: "Você precisa selecionar uma opção.",
  }),
  reportedByUserId: z.string(),
  status: z.enum(['open', 'concluded']).default('open'),
});

    