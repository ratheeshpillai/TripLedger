export type RequestTicket<Owner> = {
  owner: Owner;
  generation: number;
};

export class LatestRequestGuard<Owner> {
  private activeOwner: Owner;
  private generation = 0;

  constructor(activeOwner: Owner) {
    this.activeOwner = activeOwner;
  }

  changeOwner(owner: Owner): void {
    this.activeOwner = owner;
    this.generation += 1;
  }

  begin(owner: Owner): RequestTicket<Owner> {
    this.generation += 1;
    return { owner, generation: this.generation };
  }

  isOwnerActive(owner: Owner): boolean {
    return owner === this.activeOwner;
  }

  isCurrent(ticket: RequestTicket<Owner>): boolean {
    return ticket.owner === this.activeOwner && ticket.generation === this.generation;
  }
}
