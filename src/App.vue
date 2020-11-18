<template>
  <div id="app">
    <div
      id="header"
      style="width: 100%;height: 60px;box-shadow: 0 0 20px 0 rgba(34, 36, 38, 0.15);padding-top: 20px"
    >
      <div
        style="margin: 0 auto 0 auto;display: flex;align-items: center;width: 230px;font-size: 20px;color: #00B5AD"
      >
        <a-icon type="search" />
        <p style="margin: 0 0 0 20px">CloudPSS服务搜寻</p>
      </div>
    </div>
    <div
      id="main"
      style="width: 100%;height: calc(100% - 60px);padding: 30px 80px"
    >
      <a-card id="a-card" style="height: 450px">
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
            :label-col="{ span: 7 }"
            :wrapper-col="{ span: 6 }"
            label="选择网卡"
          >
            <a-select
              v-decorator="[
                'networkCard',
                { rules: [{ required: true, message: '请选择一个网卡!' }] }
              ]"
              @change="handleSelectChange"
              ><a-select-option
                v-for="item of Object.keys(NetworkInterfaces)"
                :value="item"
                :key="item"
              >
                {{ item }}
              </a-select-option>
            </a-select>
          </a-form-item>
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
          <a-form-item :wrapper-col="{ span: 5, offset: 7 }">
            <div style="display: flex">
              <a-button
                v-if="!loading"
                type="primary"
                @click="portScan"
                style="margin-right: 20px"
                >开始搜寻</a-button
              >
              <a-button v-else type="primary" @click="stopPortScan"
                >停止搜寻</a-button
              >
            </div>
          </a-form-item>
          <div style="display: flex">
            <span style="margin-left: 32px;margin-right: 6px"
              >已寻获服务的地址 :</span
            >
            <a-list
              style="width: 350px;height: 150px;border: #ebedf0 solid 1px;padding: 0 10px 0 10px"
              item-layout="horizontal"
              :data-source="
                searchResultList.filter(item => typeof item === 'string')
              "
            >
              <a-list-item slot="renderItem" slot-scope="item">
                <a-list-item-meta>
                  <a
                    slot="title"
                    @click="
                      () => {
                        openBrowser(item);
                      }
                    "
                    >· {{ item }}</a
                  >
                </a-list-item-meta>
              </a-list-item>
            </a-list>
          </div>
        </a-form>
      </a-card>
    </div>
  </div>
</template>
<script lang="ts">
/* eslint-disable @typescript-eslint/camelcase */
import { Component, Vue } from "vue-property-decorator";
import axios from "axios";
import { WrappedFormUtils } from "ant-design-vue/types/form/form";
import { ipcRenderer } from "electron";
import { NetworkInterfaceInfo } from "os";
import NProgress from "nprogress";
import "nprogress/nprogress.css";

@Component({
  data() {
    return { form: this.$form.createForm(this, { name: "coordinated" }) };
  }
})
export default class App extends Vue {
  form!: WrappedFormUtils;
  searchResultList: (string | false)[] = [];
  loading = false;
  CancelToken = axios.CancelToken;
  CancelSource = this.CancelToken.source();
  NetworkInterfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = {};
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
        .get(`http://${ip}${port}/cloudpss_verify`, {
          timeout: 300000,
          cancelToken: this.CancelSource.token
        })
        .then(() => {
          console.log("已找到", ip, port);
          this.searchResultList.push(`http://${ip}`);
          resolve(`http://${ip}`);
        })
        .catch(() => {
          this.searchResultList.push(false);
          resolve(false);
        });
    });
  }

  portScanner(ip: string, port: string): Promise<string | false> {
    return Promise.race([
      new Promise<false>(timeoutResolve => {
        setTimeout(() => {
          timeoutResolve(false);
        }, 10000);
      }),
      new Promise<string | false>(scanResolve => {
        const url = `wss://${ip}${port}`;
        const wss = new WebSocket(url);

        const verifyCloudPss = () => {
          axios
            .get(`http://${ip}${port}/cloudpss_verify`, { timeout: 300000 })
            .then(() => {
              console.log("已找到", ip, port);
              scanResolve(`http://${ip}${port}`);
            })
            .catch(() => {
              scanResolve(false);
            });
        };

        wss.onopen = () => {
          wss.close();
          verifyCloudPss();
        };
        wss.onerror = verifyCloudPss;
      })
    ]);
  }
  async portScan(): Promise<void> {
    this.searchResultList = [];
    this.loading = true;
    NProgress.start();
    const addressList = new Array<number>();
    const formData = this.form.getFieldsValue();
    const start = Number(formData["ip_4"]);
    const end = Number(formData["ip_5"]);
    for (let i = start; i <= end; i++) {
      addressList.push(i);
    }
    const addressPool = `${formData["ip_1"]}.${formData["ip_2"]}.${formData["ip_3"]}.`;
    this.CancelSource = this.CancelToken.source();
    await Promise.all(
      addressList.map(address =>
        this.httpTest(`${addressPool}${address}`, ":18008")
      )
    );
    this.loading = false;
    if (this.searchResultList.length === 0) {
      this.$confirm({ content: "找不到服务,请检查CloudPSS-Mini是否已启动" });
    } else {
      this.$message.success("搜寻完成");
    }
    NProgress.done();
  }

  async stopPortScan() {
    await this.CancelSource.cancel();
  }

  getNetworkCardAddress(cardName: string) {
    const networkCardInfo = (this.NetworkInterfaces[
      cardName
    ] as NetworkInterfaceInfo[]).find(
      item => item.family === "IPv4"
    ) as NetworkInterfaceInfo;
    return networkCardInfo.address;
  }

  handleSelectChange(value: string) {
    const ipFieldList = this.getNetworkCardAddress(value).split(
      "."
    ) as string[];
    this.form.setFieldsValue({
      ip_1: ipFieldList[0],
      ip_2: ipFieldList[1],
      ip_3: ipFieldList[2],
      ip_4: 1,
      ip_5: 255
    });
  }

  async mounted(): Promise<void> {
    NProgress.configure({
      parent: "#main"
    });
    ipcRenderer.on("returnNetworkInterfaces", (event, args) => {
      this.NetworkInterfaces = args;
      const userIp = this.getNetworkCardAddress(
        Object.keys(this.NetworkInterfaces)[0]
      );
      const ipFieldList = userIp.split(".") as string[];
      this.form.setFieldsValue({
        networkCard: Object.keys(this.NetworkInterfaces)[0],
        ip_1: ipFieldList[0],
        ip_2: ipFieldList[1],
        ip_3: ipFieldList[2],
        ip_4: 1,
        ip_5: 255
      });
    });
    ipcRenderer.send("getNetworkInterfaces");
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
