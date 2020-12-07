import { exec } from "child_process";

export async function execAsyncSystemCommand(command: string): Promise<Buffer> {
  return new Promise(resolve => {
    exec(command, { encoding: "buffer" }, (error, stdout, stderr) => {
      resolve(stdout);
    });
  });
}
