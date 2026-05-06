# OpenClaw Docker 本地隔离运行

日期：2026-05-03

## 目标

本机已经有 Hermes，因此 OpenClaw 不直接使用默认端口 `18789/18790`，而是用 Docker 隔离运行在：

- Gateway: `127.0.0.1:18889`
- Bridge: `127.0.0.1:18890`

本仓库只保存启动脚本和文档。OpenClaw 源码会克隆到 `.vendor/openclaw`，运行状态和 token 会放在 `.openclaw-docker/`，这两个目录都不进入 git。

脚本会自动生成 `.openclaw-docker/config/openclaw.json`，写入最小本地 Gateway 配置：

- `gateway.mode="local"`
- `gateway.bind="lan"`，用于 Docker 端口映射
- `gateway.auth.mode="token"`
- `gateway.http.endpoints.responses.enabled=true`，启用 `POST /v1/responses`

## 启动

```bash
scripts/openclaw-docker.sh up
```

查看状态：

```bash
scripts/openclaw-docker.sh status
scripts/openclaw-docker.sh health
```

查看 token：

```bash
scripts/openclaw-docker.sh token
```

停止：

```bash
scripts/openclaw-docker.sh down
```

## 避免 Hermes 端口冲突

默认端口已经避开 OpenClaw 官方默认的 `18789/18790`。如果 Hermes 或其他服务占用了 `18889/18890`，可以改端口：

```bash
OPENCLAW_DOCKER_GATEWAY_PORT=19889 \
OPENCLAW_DOCKER_BRIDGE_PORT=19890 \
scripts/openclaw-docker.sh up
```

脚本启动前会用 `lsof` 检查端口是否已被监听。

## 连接 Voice Agent TestOps

官方 OpenClaw Gateway 的 OpenResponses endpoint 是：

```text
http://127.0.0.1:18889/v1/responses
```

生成一键体检报告：

```bash
npm run voice-test:openclaw
```

默认使用 `examples/voice-testops/openclaw-suite.json`，报告会写入：

- `.voice-testops/report.json`
- `.voice-testops/report.html`

运行写真馆多轮演示套件：

```bash
npm run voice-test:photo-demo
```

这个套件在 `examples/voice-testops/photo-studio-multiturn-suite.json`，商家资料放在 `examples/voice-testops/merchants/guangying-photo.json`，场景通过 `merchantRef` 引用商家样例，避免每个场景重复维护同一份商家配置。

生成可发送给客户的 PDF 和 PNG：

```bash
npm run voice-test:photo-demo:export
```

销售演示时可以使用同一条链路的短别名：

```bash
npm run sales:demo
```

导出文件：

- `.voice-testops/report.pdf`
- `.voice-testops/report.png`

如果已经有 `.voice-testops/report.html`，可以只执行导出：

```bash
npm run report:export
```

如果要指定其他套件：

```bash
OPENCLAW_TESTOPS_SUITE=examples/voice-testops/openclaw-suite.json \
npm run voice-test:openclaw
```

也可以直接调用底层命令：

```bash
scripts/openclaw-docker.sh voice-test examples/voice-testops/openclaw-suite.json
```

等价的完整 TestOps 调用是：

```bash
npm run voice-test -- \
  --suite examples/voice-testops/openclaw-suite.json \
  --agent openclaw \
  --endpoint "http://127.0.0.1:18889/v1/responses" \
  --api-key "$(scripts/openclaw-docker.sh token)" \
  --openclaw-mode responses
```

如果要继续使用上一版自定义 `{ spoken, summary }` endpoint，可以省略 `--openclaw-mode responses`，默认是 `custom`。

## 配置模型凭证

Gateway 在线只说明 OpenClaw 已启动。默认 agent 模型是 `openai/gpt-5.5`，需要 OpenAI provider key 才能真的生成回复。

如果本机有 `OPENAI_API_KEY`，启动前导出即可，脚本会把它写入本地 `.openclaw-docker/openclaw.env` 并传进容器：

```bash
export OPENAI_API_KEY="sk-..."
scripts/openclaw-docker.sh up
```

也可以在容器里走 OpenClaw 自己的 onboarding：

```bash
docker compose --env-file .openclaw-docker/openclaw.env \
  -p voiceai-openclaw \
  -f .vendor/openclaw/docker-compose.yml \
  exec openclaw-gateway openclaw onboard --auth-choice openai-api-key
```

## 注意

- `/healthz` 只证明 Gateway 在线，不代表模型 provider 已经配置完成。
- OpenClaw 的 `POST /v1/responses` 默认关闭；本脚本会在 Docker 配置里显式打开。
- `/v1/responses` 需要 OpenClaw 有可用模型配置和凭证；没有模型凭证时，Gateway 可以健康，但 agent turn 会进入 OpenClaw 后返回模型鉴权失败。
- 不要把 `.openclaw-docker/gateway-token` 提交到 git。

## 官方参考

- Docker Compose 映射端口：OpenClaw `docker-compose.yml`
- Gateway 健康检查：`/healthz`
- OpenResponses HTTP API：`/v1/responses`
