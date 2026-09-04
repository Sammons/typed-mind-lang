const publishStates = ['draft', 'published', 'archived'] as const;

export type PublishState = (typeof publishStates)[number];

export const nextState = (current: PublishState): PublishState => {
  return current === 'draft' ? 'published' : current;
};
