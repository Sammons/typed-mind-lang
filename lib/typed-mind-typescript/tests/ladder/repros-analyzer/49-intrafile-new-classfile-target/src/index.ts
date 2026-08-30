// Callgraph increment repro — entrypoint importing only `uploadPayload`.
import { uploadPayload } from './s3-upload.ts';

export const app = uploadPayload;
