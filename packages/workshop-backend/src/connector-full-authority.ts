// In a single-owner deployment, connecting a resource is the authorization decision. This tiny
// executor keeps actions from the same Connector ordered without sending them through Workshop's
// human-approval queue. Separate Connectors do not block one another.

import type { AiChatAuthorInfo } from "@gadgets/workshop-shared/api";
import type { ActionRecord } from "./overseer.js";

type ConnectorAction = ActionRecord & {type: "action"};

type ApplyConnectorAction = (
  record: ConnectorAction,
  owner: AiChatAuthorInfo,
) => Promise<void>;

export function connectorFullAuthorityEnabled(env: {
  SINGLE_USER_CONNECTOR_FULL_AUTHORITY?: string;
  ADMINS?: string[];
}): boolean {
  return env.SINGLE_USER_CONNECTOR_FULL_AUTHORITY === "true" && env.ADMINS?.length === 1;
}

export class ConnectorFullAuthorityExecutor {
  #tails = new Map<number, Promise<void>>();

  constructor(
    private ownerProfile: () => Promise<AiChatAuthorInfo>,
    private apply: ApplyConnectorAction,
  ) {}

  run(record: ConnectorAction): Promise<void> {
    const previous = this.#tails.get(record.gatekeeperId) ?? Promise.resolve();
    const current = previous.catch(() => {}).then(async () => {
      const owner = await this.ownerProfile();
      await this.apply(record, owner);
    });
    this.#tails.set(record.gatekeeperId, current);
    void current.finally(() => {
      if (this.#tails.get(record.gatekeeperId) === current) {
        this.#tails.delete(record.gatekeeperId);
      }
    }).catch(() => {});
    return current;
  }
}
