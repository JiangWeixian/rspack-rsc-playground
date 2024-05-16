export async function bufferReadableStream(
  reader: ReadableStreamDefaultReader,
  cb?: (chunk: string) => void,
) {
  const decoder = new TextDecoder()
  let result = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    const stringValue = typeof value === 'string' ? value : decoder.decode(value, { stream: true })

    result += stringValue

    if (cb) {
      cb(stringValue)
    }
  }

  return result
}
