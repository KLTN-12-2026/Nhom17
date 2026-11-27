const completedContentIds: unknown[] = progress.completed_content_ids || [];
  const completedIds = new Set<string>(completedContentIds.map((id: unknown) => String(id)));