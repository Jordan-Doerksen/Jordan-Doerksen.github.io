export function createAtlasIndex(atlas) {
  return {
    topicsById: new Map(atlas.topics.map((topic) => [topic.id, topic])),
    topicsBySlug: new Map(atlas.topics.map((topic) => [topic.slug, topic])),
    claimsById: new Map(atlas.claims.map((claim) => [claim.id, claim])),
    sourcesById: new Map(atlas.sources.map((source) => [source.id, source])),
    relationshipsById: new Map(
      atlas.relationships.map((relationship) => [relationship.id, relationship])
    )
  };
}

export function topicClaims(topic, index) {
  return topic.claim_ids.map((id) => index.claimsById.get(id)).filter(Boolean);
}

export function claimSources(claim, index) {
  return claim.source_ids.map((id) => index.sourcesById.get(id)).filter(Boolean);
}

export function phenomenonTrail(topic, atlas, index) {
  const phenomenonId = topic.phenomenon_ids[0];
  const phenomenon = atlas.phenomena.find((entry) => entry.id === phenomenonId);
  if (!phenomenon) return null;
  const siblings = atlas.topics.filter(
    (entry) => entry.published && entry.phenomenon_ids[0] === phenomenonId
  );
  const position = siblings.findIndex((entry) => entry.id === topic.id);
  if (position < 0) return null;
  return {
    phenomenon,
    position: position + 1,
    total: siblings.length,
    previous: siblings[position - 1] || null,
    next: siblings[position + 1] || null
  };
}

export function topicNeighbors(topicId, atlas, index, limit = 6) {
  return atlas.relationships
    .filter(
      (relationship) =>
        relationship.from_topic_id === topicId || relationship.to_topic_id === topicId
    )
    .sort((first, second) => first.trail_priority - second.trail_priority)
    .slice(0, limit)
    .map((relationship) => {
      const neighborId =
        relationship.from_topic_id === topicId
          ? relationship.to_topic_id
          : relationship.from_topic_id;
      return { relationship, topic: index.topicsById.get(neighborId) };
    })
    .filter((entry) => entry.topic);
}
