本项目用于保存家庭宽带 ipv4/ipv6 端口，并根据当前网络自动重定向以访问 nas、openwrt、家庭内网服务器等，旨在解决 Lucky STUN 内网穿透端口变化频繁且不规律的问题。



<u>*说明，在本文档中：*</u>

<u>*redirect.mydomain.com 指访问本项目部署的 Cloudflare Worker 的域名；*</u>

<u>*mynas.mydomain.com 指 nas DDNS 的域名（ipv4 和 ipv6 均使用该域名）；*</u>

<u>*\*.mynas.mydomain.com 指访问 nas 上具体服务的通配符域名，例如 aria2.mynas.mydomain.com、lucky.mynas.mydomain.com。*</u>



# 部署到 Cloudflare Workers

- **计算（Workers）/Workers 和 Pages/创建/从 Hello World! 开始** 创建 Worker，编辑代码，粘贴 worker.js 内的代码并部署；
- **存储和数据库/KV/Create Instance** 创建 KV，自定义命名空间名称这里假设为 STUN_Redirect，创建 KV 对，密钥为 CONFIG，值为 {}；
- 回到创建的 Worker，在 **绑定/添加绑定/KV 命名空间/添加绑定** 绑定创建的 KV，变量名称设置为 KV，KV 命名空间选择先前创建的命名空间（STUN_Redirect）;
- 在 **设置/域和路由** 添加自己的域名，假设为 redirect.mydomain.com。



# 使用

- 假设为 nas 准备的二级域名为 mynas.mydomain.com，在 Lucky 中某个服务反代的域名设置为 server.mynas.mydomain.com，则访问 https://redirect.mydomain.com/mynas/server 即可。
  > 例如 OpenList 的反代域名设置为 openlist.mynas.mydomain.com，后续通过 https://redirect.mydomain.com/mynas/openlist 可自动重定向至https://openlist.mynas.mydomain.com:ipv4端口/ipv6端口，该项目支持双栈网络，具体的端口会根据当前的网络类型（ipv4或ipv6）自动设置。
- 申请SSL证书时建议申请 \*.mynas.mydomain.com 通配符证书。
- DNS服务建议使用 Cloudflare 或其他支持通配符解析的DNS服务商，在解析域名时，mynas.mydomain.com 用于DDNS，将 \*.mynas.mydomain.com CNAME 至 mynas.mydomain.com 即可。

## 端口

### 保存端口

假设要保存端口为ipv4：14444，ipv6：16666

#### 保存 ipv4 端口

https://redirect.mydomain.com/port/mynas/ipv4/14444

使用Lucky/STUN 内网穿透/Webhook自动更新：

- 接口地址：https://redirect.mydomain.com/port/mynas/ipv4/{port}
- 请求方法：GET
- 接口调用成功包含的字符串：success

#### 保存 ipv6 端口

https://redirect.mydomain.com/port/mynas/ipv6/16666



### 查看端口

#### 查看所有端口

https://redirect.mydomain.com/port/mynas

#### 查看 ipv4 端口

https://redirect.mydomain.com/port/mynas/ipv4

#### 查看 ipv6 端口

https://redirect.mydomain.com/port/mynas/ipv6



## 域名

反代域名使用 server.mynas.mydomain.com 时，要保存的域名应为 mydomain.com

### 保存域名

https://redirect.mydomain.com/host/mynas/mydomain.com

### 查看域名

https://redirect.mydomain.com/host/mynas



## 其他用法

### 查看 ip

https://redirect.mydomain.com/ip

返回访问该服务的 ip，支持 ipv4 和 ipv6。

### URL 路径支持

假设要访问的路径为server.mynas.mydomain.com/path1/path2?uuid=123456，则访问https://redirect.mydomain.com/mynas/server/path1/path2?uuid=123456即可。

#### Aria2 远程访问

假设反代域名为aria2.mynas.mydomain.com，则 RPC 地址为 https://redirect.mydomain.com/mynas/aria2/jsonrpc。

#### Lucky 安全入口

假设反代域名为 lucky.mynas.mydomain.com，安全入口为 lucky666，则 RPC 地址为 https://redirect.mydomain.com/mynas/lucky/lucky666。

### 直接登录

直接在 URL 中使用用户名和密码登录并不安全，请确认你了解你在做什么以及其中的安全风险，再使用该方法登录。

假设反代域名为 server.mynas.mydomain.com，登录用户名为 user，密码为 password，原登录方式为 user:password@server.mynas.mydomain.com，则访问https://user:password@redirect.mydomain.com/mynas/server即可。