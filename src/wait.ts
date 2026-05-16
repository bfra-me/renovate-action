type SetTimeoutCallback = () => void
type SetTimeoutFn = (callback: SetTimeoutCallback, milliseconds: number) => unknown

const setTimeoutSafe = globalThis.setTimeout as unknown as SetTimeoutFn

export async function wait(milliseconds: number): Promise<string> {
  if (Number.isNaN(milliseconds)) {
    throw new TypeError('milliseconds not a number')
  }

  await new Promise<void>(resolve => {
    setTimeoutSafe(resolve, milliseconds)
  })
  return 'done!'
}
