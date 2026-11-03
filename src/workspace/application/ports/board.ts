/** The board revision orders concurrent task moves across devices. */
export interface BoardRepository {
  revision(): Promise<number>;
  bumpRevision(): Promise<number>;
}
