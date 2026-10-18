export type UploadFailure = {
  readonly fileName: string
  readonly message: string
}

// One request per file, strictly one after another: Vercel caps a request body
// at 4.5 MB, and the server numbers a new photo from the ones already stored,
// so parallel uploads would claim the same position. A failed file does not
// stop the rest; the admin gets the list of what did not make it.
export async function uploadInOrder<F extends { readonly name: string }>(
  files: readonly F[],
  uploadOne: (file: F) => Promise<string | null>,
  onProgress: (done: number) => void,
): Promise<UploadFailure[]> {
  const failures: UploadFailure[] = []

  for (const [index, file] of files.entries()) {
    const message = await uploadOne(file)
    if (message !== null) failures.push({ fileName: file.name, message })
    onProgress(index + 1)
  }

  return failures
}
