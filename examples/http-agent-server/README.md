# HTTP Agent Server Example

This is a tiny no-dependency Node.js server that implements the generic Voice Agent TestOps HTTP contract.

It is intentionally simple: copy the shape, replace `createTestAgentResponse()` with your own agent call, and keep the response contract.

## Run

Terminal 1:

```bash
npm run example:http-agent
```

Terminal 2:

```bash
npm run voice-test -- \
  --suite examples/voice-testops/openclaw-suite.json \
  --agent http \
  --endpoint http://127.0.0.1:4318/test-turn
```

## Contract

`POST /test-turn` receives:

```json
{
  "suiteName": "回归测试",
  "scenarioId": "pricing",
  "turnIndex": 0,
  "customerText": "单人写真多少钱",
  "source": "website",
  "merchant": {},
  "messages": []
}
```

It returns:

```json
{
  "spoken": "单人写真一般是 599-1299 元，包含服装 2 套，精修 9 张。档期需要人工确认。",
  "summary": {
    "source": "website",
    "intent": "pricing",
    "level": "medium",
    "need": "客户咨询单人写真多少钱",
    "questions": ["单人写真多少钱"],
    "nextAction": "人工确认档期后跟进",
    "transcript": []
  }
}
```

