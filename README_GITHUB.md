# 雀魂人格测试（GitHub 使用说明）

本项目 GitHub 仓库地址：

- https://github.com/YUMI233666/Majong_local

## 1. 从 GitHub 获取项目

### 方式 A：直接下载 ZIP
1. 打开仓库主页。
2. 点击 `Code` -> `Download ZIP`。
3. 解压后进入项目目录。

### 方式 B：使用 Git 克隆（推荐）

```bash
git clone https://github.com/YUMI233666/Majong_local.git
cd Majong_local
```

## 2. 本地运行项目

### 方式 A：使用已打包本地版（推荐普通用户）

1. 进入 `output/` 目录。
2. 解压 `雀魂人格测试_本地版.zip`。
3. 双击 `雀魂人格测试_本地版/启动程序.bat`。
4. 浏览器会自动打开：`http://127.0.0.1:8000`。
5. 使用完毕后双击 `雀魂人格测试_本地版/停止程序.bat`。

### 方式 B：使用源码运行（开发者）

1. 确保已安装 Python 3.10+。
2. 在项目根目录执行：

```bash
python api_server.py
```

3. 浏览器访问：

```text
http://127.0.0.1:8000
```

## 3. 项目结构说明（关键）

- `public/`：前端页面与静态资源。
- `api_server.py`：本地 API + 静态资源服务入口。
- `题目.txt`：题库源数据。
- 各角色目录（如 `一姬/`、`四宫夏生/` 等）：角色图片与标签文本资料。
- `output/`：构建产物、发布包和结果文件。

## 4. 更新代码并提交到 GitHub

```bash
git add -A
git commit -m "update: 描述本次修改"
git push origin main
```

## 5. 覆盖远端仓库（谨慎使用）

如果你明确要用本地内容完全覆盖 GitHub 远端：

```bash
git add -A
git commit -m "覆盖上传本地版本"
git push --force origin main
```

> 提示：`--force` 会重写远端历史，请确保这是你期望的操作。

## 6. 常见问题

### Q1：双击启动后网页没打开
- 手动访问 `http://127.0.0.1:8000`。
- 检查是否被防火墙或杀毒软件拦截。

### Q2：端口占用（8000）
- 关闭其他占用 8000 端口的程序后再启动。

### Q3：角色介绍或标签显示异常
- 确保各角色目录下的 `.txt` 文件与图片文件未被删除。
- 确保已同步/保留 `public/` 和角色资料目录。

---
如需给用户分发，建议直接发送：`output/雀魂人格测试_本地版.zip`。
