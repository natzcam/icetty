import Conf from "conf";
import os from "os";

export class Config extends Conf {
  constructor() {
    super();
  }

  shell(shell?: string) {
    if (shell) {
      this.set("shell", shell);
      return shell;
    } else {
      let shell = this.get("shell");
      if (!shell) {
        shell = os.platform() === "win32" ? "powershell.exe" : "bash";
        this.set("shell", shell);
      }
      return shell;
    }
  }
}

const config = new Config();
export default config;
