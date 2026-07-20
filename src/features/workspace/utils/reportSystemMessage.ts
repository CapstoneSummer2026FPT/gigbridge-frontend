export interface ReportSystemMessageMetadata {
  kind: 'reportContract';
  reportId: string;
  contractId: string;
  eventType: 'created' | 'updated' | 'resolved';
  actorName: string | null;
  actorRole: string | null;
  issueType: number;
  desiredResolution: string;
  description: string;
  status: number;
  resolutionAction: number | null;
  explanation: string | null;
  proposedResolution: string | null;
  rejectReason: string | null;
}

const valueOf = <T>(source: Record<string, unknown>, camel: string, pascal: string): T | undefined =>
  (source[camel] ?? source[pascal]) as T | undefined;

export function parseReportSystemMessageMetadata(
  metadata: string | Record<string, unknown> | null | undefined,
): ReportSystemMessageMetadata | null {
  if (!metadata) return null;

  try {
    const source = (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) as Record<string, unknown>;
    const kind = valueOf<string>(source, 'kind', 'Kind');
    const reportId = valueOf<string>(source, 'reportId', 'ReportId');
    const contractId = valueOf<string>(source, 'contractId', 'ContractId');
    const eventType = valueOf<string>(source, 'eventType', 'EventType');

    if (
      kind !== 'reportContract' ||
      !reportId ||
      !contractId ||
      !['created', 'updated', 'resolved'].includes(eventType ?? '')
    ) {
      return null;
    }

    return {
      kind: 'reportContract',
      reportId,
      contractId,
      eventType: eventType as ReportSystemMessageMetadata['eventType'],
      actorName: valueOf<string | null>(source, 'actorName', 'ActorName') ?? null,
      actorRole: valueOf<string | null>(source, 'actorRole', 'ActorRole') ?? null,
      issueType: Number(valueOf(source, 'issueType', 'IssueType') ?? 0),
      desiredResolution: String(valueOf(source, 'desiredResolution', 'DesiredResolution') ?? ''),
      description: String(valueOf(source, 'description', 'Description') ?? ''),
      status: Number(valueOf(source, 'status', 'Status') ?? 0),
      resolutionAction: valueOf<number | null>(source, 'resolutionAction', 'ResolutionAction') ?? null,
      explanation: valueOf<string | null>(source, 'explanation', 'Explanation') ?? null,
      proposedResolution: valueOf<string | null>(source, 'proposedResolution', 'ProposedResolution') ?? null,
      rejectReason: valueOf<string | null>(source, 'rejectReason', 'RejectReason') ?? null,
    };
  } catch {
    return null;
  }
}
