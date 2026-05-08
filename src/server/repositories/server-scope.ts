export type ServerScopeInput = {
  serverId?: number;
  serverIds?: number[];
};

export type ServerScopeCondition = {
  sql: string;
  params: number[];
};

function normalizeServerIds(serverIds: number[] | undefined): number[] {
  if (!serverIds) {
    return [];
  }

  return Array.from(
    new Set(
      serverIds
        .map((serverId) => Math.floor(serverId))
        .filter((serverId) => Number.isFinite(serverId) && serverId > 0)
    )
  );
}

export function normalizeServerScopeInput(
  input: number | ServerScopeInput
): ServerScopeInput {
  if (typeof input === "number") {
    return { serverId: input };
  }

  return input;
}

export function buildServerScopeCondition(
  columnName: string,
  input: number | ServerScopeInput
): ServerScopeCondition {
  const scope = normalizeServerScopeInput(input);
  const serverIds = normalizeServerIds(scope.serverIds);
  if (serverIds.length > 0) {
    return {
      sql: `${columnName} IN (${serverIds.map(() => "?").join(", ")})`,
      params: serverIds
    };
  }

  if (scope.serverId && Number.isFinite(scope.serverId) && scope.serverId > 0) {
    return {
      sql: `${columnName} = ?`,
      params: [Math.floor(scope.serverId)]
    };
  }

  return {
    sql: "1 = 0",
    params: []
  };
}
