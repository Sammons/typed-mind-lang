export interface JobRecord {
  id: string;
  procoreTemplateId?: number;
}

export const readJob = (id: string): JobRecord => {
  return { id };
};
