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
        <div>
          <a-button
            type="primary"
            style="margin-bottom: 10px;    left: 89%;"
            @click="
              () => {
                searchResultList = [];
              }
            "
            >刷新</a-button
          >
          <a-table
            :columns="tableHerderList"
            :data-source="searchResultList"
            size="small"
            :pagination="false"
            :scroll="{ y: 290 }"
          >
            <a
              slot="ip"
              slot-scope="text"
              @click="
                () => {
                  openBrowser(text);
                }
              "
              >{{ text }}</a
            >
            <span slot="operation" slot-scope="text, record">
              <a-button
                style="margin-right: 10px"
                size="small"
                type="primary"
                @click="openVpn(record)"
                :loading="record.loading"
                >开启vpn</a-button
              >
              <a-button
                @click="closeVpn(record)"
                :loading="record.loading"
                size="small"
                type="primary"
                >关闭vpn</a-button
              >
            </span>
          </a-table>
        </div>
      </a-card>
    </div>
    <a-modal style="width: 300px" v-model="modelShow" @ok="modelShow = false"
      ><vrcode
        style="display: flex;justify-content:center"
        :value="JSON.stringify({ test: 'test' })"
        :options="{ size: 200, level: 'Q' }"
    /></a-modal>
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
import { uniqBy } from "lodash";
import vrcode from "@ispa.io/vrcode";
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
  },
  components: { vrcode }
})
export default class App extends Vue {
  uniqBy = uniqBy;
  advancedSetup = true;
  form!: WrappedFormUtils;
  searchResultList: {
    ip: string | false;
    MAC: string;
    TTL: number;
    type: string;
    loading: boolean;
  }[] = [];
  loading = false;
  CancelToken = axios.CancelToken;
  CancelSource = this.CancelToken.source();
  NetworkInterfaces: NodeJS.Dict<NetworkInterfaceInfo[]> = {};

  modelShow = false;

  tableHerderList = [
    {
      dataIndex: "ip",
      key: "ip",
      title: "ip",
      scopedSlots: { customRender: "ip" },
      width: 150
    },
    { dataIndex: "type", title: "节点类型", width: 100 },
    {
      dataIndex: "ip",
      key: "operation",
      title: "操作",
      scopedSlots: { customRender: "operation" },
      align: "center"
    }
  ];

  openVpn(record: { ip: string; loading: boolean }) {
    record.loading = true;
    axios
      .get(`/system/vpn`, { baseURL: `http://${record.ip}:3000` })
      .then(() => {
        record.loading = false;
        this.modelShow = true;
      })
      .catch(() => {
        record.loading = false;
      });
  }

  closeVpn(record: { ip: string; loading: boolean }) {
    record.loading = true;
    axios
      .delete(`/system/vpn`, { baseURL: `http://${record.ip}:3000` })
      .then(() => {
        record.loading = false;
      })
      .catch(() => {
        record.loading = false;
      });
  }

  openBrowser(url: string) {
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
      const ip = args.ip;
      const mac = args.macAddress;
      const TTL = 0;
      const type = args?.equipmentInfo?.serverStatus?.type;
      if (this.searchResultList.findIndex(x => x.ip === ip) != -1) {
        const searchResult = this.searchResultList.find(x => x.ip === ip);
        if (searchResult != null) {
          searchResult.TTL = 0;
          searchResult.MAC = mac ?? searchResult.MAC;
          searchResult.type = type ?? searchResult.type;
        }
      } else
        this.searchResultList.push({
          ip: ip,
          MAC: mac,
          TTL: TTL,
          type: type,
          loading: false
        });
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
<style></style>
