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
        <a-button
          type="primary"
          style="margin-bottom: 10px;float: right;"
          @click="
            () => {
              searchResultList = [];
            }
          "
          >刷新</a-button
        >
        <div style="display: flex">
          <span style="margin-left: 32px;margin-right: 6px"
            >已寻获服务的地址 :</span
          >
          <a-list
            id="a-list"
            style="width: 350px;height: 350px;border: #ebedf0 solid 1px;padding: 0 10px 0 10px;overflow: auto"
            item-layout="horizontal"
            :data-source="searchResultList"
          >
            <a-list-item slot="renderItem" slot-scope="item">
              <a-list-item-meta>
                <a
                  slot="title"
                  @click="
                    () => {
                      openBrowser(item.url);
                    }
                  "
                  >{{ item.url }}</a
                >
              </a-list-item-meta>

              <span v-if="item.type != null">节点类型：{{ item.type }}</span>
            </a-list-item>
          </a-list>
        </div>
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
import dgram from "dgram";
import { uniqBy } from "lodash";
/**
 *设备信息
 */
interface CloudPSSEquipmentInfo {
  /**
   *主板BIOS ID
   */
  biosUUid: string;
  /**
   *web服务状态
   */
  serverStatus: {
    type: "Parent" | "Child";
    parentEquipmentAddress: string;
  };
  /**
   *服务版本
   */
  CloudPSSVersion: string;
}
type ipArgs = { ip: string } & CloudPSSBroadcastInfo;
/**
 *广播信息
 */
interface CloudPSSBroadcastInfo {
  /**
   *设备信息
   */
  equipmentInfo: CloudPSSEquipmentInfo;

  /**
   *mac地址
   */
  macAddress: string;
}
@Component({
  data() {
    return { form: this.$form.createForm(this, { name: "coordinated" }) };
  }
})
export default class App extends Vue {
  uniqBy = uniqBy;
  advancedSetup = true;
  form!: WrappedFormUtils;
  searchResultList: {
    url: string | false;
    MAC: string;
    TTL: number;
    type: string;
  }[] = [];
  loading = false;
  CancelToken = axios.CancelToken;
  CancelSource = this.CancelToken.source();
  NetworkInterfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = {};

  openBrowser(url: string) {
    console.log(url);
    require("electron")
      .shell.openExternal(`http://${url}`)
      .catch((e: Error) => {
        throw e;
      });
  }
  /** 打开高级设置 */
  openAdvancedSetup() {
    ipcRenderer.send("getNetworkInterfaces");
    this.advancedSetup = false;
  }

  /**
   * 获取网卡地址的ip地址
   *
   * */
  getNetworkCardAddress(cardName: string) {
    const networkCardInfo = (this.NetworkInterfaces[
      cardName
    ] as NetworkInterfaceInfo[]).find(
      item => item.family === "IPv4"
    ) as NetworkInterfaceInfo;
    return networkCardInfo.address;
  }
  /**
   * 初始化ip地址
   *
   * */
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
  /**
   * 获取Mac地址
   * mac为设备在局域网内的物理地址
   *
   * */
  async getMacAddress(ipAddress: string): Promise<string> {
    return new Promise<string>(resolve => {
      ipcRenderer.send("getMac", ipAddress);
      ipcRenderer.once(`returnMac${ipAddress}`, (event, args) => {
        resolve(
          ((args as string).match(
            /\S{2}-\S{2}-\S{2}-\S{2}-\S{2}-\S{2}/
          ) as unknown) as string
        );
      });
    });
  }

  async mounted(): Promise<void> {
    NProgress.configure({
      parent: "#a-list"
    });
    ipcRenderer.send("getNetworkInterfaces");
    ipcRenderer.on("returnNetworkInterfaces", (event, args: ipArgs) => {
      console.log(args);
      const ip = args.ip;
      const mac = args.macAddress;
      const TTL = 0;
      const type = args?.equipmentInfo?.serverStatus?.type;
      if (this.searchResultList.findIndex(x => x.url === ip) != -1) {
        const searchResult = this.searchResultList.find(x => x.url === ip);
        if (searchResult != null) {
          searchResult.TTL = 0;
          searchResult.MAC = mac ?? searchResult.MAC;
          searchResult.type = type ?? searchResult.type;
        }
      } else
        this.searchResultList.push({ url: ip, MAC: mac, TTL: TTL, type: type });
    });
    setInterval(() => {
      this.searchResultList = this.searchResultList
        .map(x => {
          x.TTL++;
          return x;
        })
        .filter(x => x.TTL < 20);
    }, 1000);
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
.ant-list-item-meta-title {
  margin-bottom: 0 !important ;
}
</style>
