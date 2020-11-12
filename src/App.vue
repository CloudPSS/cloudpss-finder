<template>
  <div id="app">
    <div
      style="width: 100%;height: 60px;box-shadow: 0 0 20px 0 rgba(34, 36, 38, 0.15);padding-top: 20px"
    >
      <div
        style="margin: 0 auto 0 auto;display: flex;align-items: center;width: 230px;font-size: 20px;color: #00B5AD"
      >
        <a-icon type="search" />
        <p style="margin: 0 0 0 20px">CloudPSS服务搜寻</p>
      </div>
    </div>
    <a-card style="width: 80%;margin: 30px auto;">
      <a-tooltip
        placement="topRight"
        title="以下配置皆为自动生成,若非必要,请不要修改"
      >
        <a-icon
          class="question_icon"
          type="question-circle"
          style="margin-left: 96%;font-size:20px;color: #00b5ad"
        />
      </a-tooltip>
      <a-form style="margin: 0 20px 0 20px" :form="form">
        <a-form-item
          label="扫描ip池段"
          :label-col="{ span: 7 }"
          :wrapper-col="{ span: 17 }"
        >
          <a-input-group class="ip_config" compact>
            <a-input
              style="width: 50px;text-align: center"
              v-decorator="[
                'ip_1',
                {
                  rules: [{ required: true, message: ' ' }]
                }
              ]"
            />
            <a-input
              style=" width: 10px; pointer-events: none; backgroundColor: #fff;text-align: center;border-left-color: white"
              placeholder="."
              disabled
            />
            <a-input
              style="width: 50px;text-align: center;border-left-color: white"
              v-decorator="[
                'ip_2',
                {
                  rules: [{ required: true }]
                }
              ]"
            />
            <a-input
              style=" width: 10px; pointer-events: none; backgroundColor: #fff;text-align: center;border-left-color: white"
              placeholder="."
              disabled
            />
            <a-input
              style="width: 50px;text-align: center;border-left-color: white"
              v-decorator="[
                'ip_3',
                {
                  rules: [{ required: true }]
                }
              ]"
            />
            <a-input
              style=" width: 10px; pointer-events: none; backgroundColor: #fff;text-align: center;border-left-color: white"
              placeholder="."
              disabled
            />
            <a-input
              style="width: 50px;text-align: center;border-left-color: white"
              v-decorator="[
                'ip_4',
                {
                  rules: [{ required: true }]
                }
              ]"
            />
            <a-input
              style=" width: 10px; pointer-events: none; backgroundColor: #fff;text-align: center; border-left: 0;border-left-color: white"
              placeholder="~"
              disabled
            />
            <a-input
              style="width: 50px;text-align: center;border-left-color: white"
              v-decorator="[
                'ip_5',
                {
                  rules: [{ required: true }]
                }
              ]"
            />
          </a-input-group>
        </a-form-item>
        <a-form-item
          :label-col="{ span: 5, offset: 2 }"
          :wrapper-col="{ span: 5 }"
          label="端口"
        >
          <a-input placeholder="非必填" v-decorator="['port']"></a-input>
        </a-form-item>
        <a-form-item :wrapper-col="{ span: 5, offset: 7 }">
          <a-button :loading="loading" type="primary" @click="portScan"
            >开始搜寻</a-button
          >
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>
<script lang="ts">
/* eslint-disable @typescript-eslint/camelcase */
import { Component, Vue } from "vue-property-decorator";
import axios from "axios";
import { getUserIP } from "./get-user-ip";
import { WrappedFormUtils } from "ant-design-vue/types/form/form";

@Component({
  data() {
    return { form: this.$form.createForm(this, { name: "coordinated" }) };
  }
})
export default class App extends Vue {
  form!: WrappedFormUtils;

  loading = false;
  openBrowser(url: string) {
    require("electron")
      .shell.openExternal(url)
      .catch((e: Error) => {
        throw e;
      });
  }

  httpTest(ip: string, port: string): Promise<string | false> {
    return new Promise<string | false>(resolve => {
      axios
        .get(`http://${ip}${port}`, { timeout: 5000 })
        .then(() => {
          console.log("已找到", ip, port);
          resolve(`http://${ip}`);
        })
        .catch(() => {
          resolve(false);
        });
    });
  }

  portScanner(ip: string, port: string): Promise<string | false> {
    return new Promise(resolve => {
      const url = `wss://${ip}${port}`;
      const wss = new WebSocket(url);

      setTimeout(() => {
        wss.close();
        resolve(false);
      }, 5000);

      const verifyCloudPss = () => {
        axios
          .get(`http://${ip}${port}`, { timeout: 5000 })
          .then(() => {
            console.log("已找到", ip, port);
            resolve(`http://${ip}${port}`);
          })
          .catch(() => {
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

  async portScan(): Promise<void> {
    this.loading = true;
    const addressList = new Array<number>();
    const formData = this.form.getFieldsValue();
    const start = Number(formData["ip_4"]);
    const end = Number(formData["ip_5"]);
    const port = formData["port"] === "" ? "" : ":" + formData["port"];
    for (let i = start; i <= end; i++) {
      addressList.push(i);
    }
    const addressPool = `${formData["ip_1"]}.${formData["ip_2"]}.${formData["ip_3"]}.`;
    const resultList = await Promise.all(
      addressList.map(address =>
        this.httpTest(`${addressPool}${address}`, port)
      )
    );
    this.loading = false;
    const result = resultList.find(item => item);
    if (result == null) {
      this.$confirm({ content: "找不到服务,请检查CloudPSS服务是否已启动" });
    } else {
      const openBrowser = this.openBrowser;
      this.$success({
        content: "服务已寻获,点击确定访问主页",
        onOk() {
          openBrowser(result as string);
        }
      });
    }
  }

  async mounted(): Promise<void> {
    const userIp = await getUserIP();
    const ipFieldList = userIp.split(".") as string[];
    this.form.setFieldsValue({
      ip_1: ipFieldList[0],
      ip_2: ipFieldList[1],
      ip_3: ipFieldList[2],
      ip_4: 1,
      ip_5: 255,
      port: ""
    });
  }
}
</script>
<style>
.ip_config /deep/ input {
  padding: 0;
}

.ip_config /deep/ .ant-input:hover {
  border-color: #40a9ff !important;
  border-right-width: 1px !important;
}

.ip_config .no_border_left /deep/ .ant-input {
  border-left-color: white;
}
.ant-form-item-required::before {
  color: #00000000 !important;
}
</style>
