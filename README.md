# 🛡️ Secure Config Validator

![GitHub release](https://img.shields.io/github/v/release/felipewatter/secure-config-validator)
![GitHub](https://img.shields.io/github/license/felipewatter/secure-config-validator)
![GitHub language count](https://img.shields.io/github/languages/count/felipewatter/secure-config-validator)

A CLI tool to detect insecure configurations before deploying your application.

---

## ✅ Features

- Detects dangerous or weak config values
- Supports `.env`, `.json`, `.yml`, and more
- Extensible validation rules
- Clear terminal output
- CI integration ready

---

## 💻 Usage

```bash
npx secure-config-validator ./path/to/config.env
```

---

## ⚙️ Adding Custom Rules

Edit `src/rules.ts` to add your own patterns or keys.

---

## 💡 Best Practices

- Always scan configs before deploying
- Use in pre-commit or CI pipelines
- Review custom rules regularly

---

## 🧑‍💻 Contributing

Pull requests and feedback are welcome!

---

## 📄 License

MIT License