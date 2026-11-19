type FunctionContext = {
  req: { headers: Record<string, string | undefined> };
  res: { json: (body: unknown, status?: number) => unknown };
  log: (message: string) => void;
  error: (message: string) => void;
};
declare function main(context: FunctionContext): Promise<unknown>;
export default main;
