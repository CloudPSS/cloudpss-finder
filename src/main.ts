import Vue from "vue";
import App from "./App.vue";
import store from "./store";
import "ant-design-vue/dist/antd.css";
import {
  Button,
  message,
  Progress,
  Form,
  Input,
  Row,
  Col,
  Icon,
  Card,
  Tooltip,
  Modal,
  List,
  Select,
  Table
} from "ant-design-vue";
Vue.config.productionTip = false;
Vue.use(Button);
Vue.use(Progress);
Vue.use(Form);
Vue.use(Input);
Vue.use(Row);
Vue.use(Col);
Vue.use(Icon);
Vue.use(Card);
Vue.use(Tooltip);
Vue.use(Modal);
Vue.use(List);
Vue.use(Select);
Vue.use(Table);
Vue.prototype.$message = message;
Vue.prototype.$confirm = Modal.confirm;
Vue.prototype.$success = Modal.success;

new Vue({
  store,
  render: h => h(App)
}).$mount("#app");
