export const trimAllWhitespace = (input: string) =>
  input.replace(/\s*|\n*/g, '')

export const trimComments = (input: string) => input.replace(/^\s*#.*$/gm, '')

export const normaliseString = (input: string) =>
  trimAllWhitespace(trimComments(input))
