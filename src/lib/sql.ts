// % and _ are LIKE wildcards; someone typing them means the characters.
export function escapeLikePattern(term: string): string {
  return term.replace(/[\\%_]/g, (character) => `\\${character}`)
}
