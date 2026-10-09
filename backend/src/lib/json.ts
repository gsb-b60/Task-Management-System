// Prisma returns BigInt for `GitHubRepository.githubId`, and native
// JSON.stringify throws on BigInt. Registering toJSON once here means every
// serialisation path — express res.json included — renders it as a string,
// which is also how GitHub IDs are consumed (they exceed 2^53 in time).
//
// Side-effect module: import from the app entry (architecture-backend.md §7).
declare global {
  interface BigInt {
    toJSON(): string;
  }
}

BigInt.prototype.toJSON = function toJSON(): string {
  return this.toString();
};

export {};
