<template>
  <div id="app">
    test
  </div>
</template>
<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import axios from "axios";
import { getUserIP } from "./get-user-ip";
import 'ant-design-vue/dist/antd.css';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ipcRenderer } = require("electron");

@Component({})
export default class App extends Vue {
  portScanner(ip: string, port: number) {
    return new Promise(resolve => {
      const url = `wss://${ip}:${port}`;
      const wss = new WebSocket(url);

      setTimeout(() => {
        console.log("超时", ip);
        wss.close();
        resolve(false);
      }, 5000);

      const verifyCloudPss = () => {
        axios
          .get(`http://${ip}:${port}/sign_in/`, { timeout: 5000 })
          .then(() => {
            console.log("已找到", ip, port);
            ipcRenderer.sendSync("openBrowser", `http://${ip}:${port}`);
            resolve(true);
          })
          .catch(() => {
            console.log("链接失败", ip);
            resolve(false);
          });
      };

      wss.onopen = () => {
        wss.close();
        verifyCloudPss();
      };
      wss.onerror = verifyCloudPss;
    });
  }

  async mounted(): Promise<void> {
    const addressList = new Array<number>();
    for (let i = 1; i <= 255; i++) {
      addressList.push(i);
    }
    const addressPool = (await getUserIP()).slice(0, 10);
    await Promise.all(
      addressList.map(address =>
        this.portScanner(`${addressPool}${address}`, 80)
      )
    );
  }
}
</script>
