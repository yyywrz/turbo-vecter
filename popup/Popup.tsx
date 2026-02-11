import { useEffect, useMemo, useState } from "react"

type EffectOption = "off" | "magnetic" | "light" | "electric"

const STORAGE_KEYS = {
  effect: "turboEffect",
  language: "turboLanguage"
} as const

function Popup() {
  const [language, setLanguage] = useState<"en" | "zh">("en")
  const [effect, setEffect] = useState<EffectOption>("off")

  const storage = globalThis.chrome?.storage?.sync ?? globalThis.chrome?.storage?.local

  useEffect(() => {
    if (!storage) {
        console.warn("[Turbo‑Vecter] Storage API not available, settings will not be saved.")
      return
    }

    storage.get([STORAGE_KEYS.effect, STORAGE_KEYS.language], (result) => {
      if (result[STORAGE_KEYS.effect]) {
        setEffect(result[STORAGE_KEYS.effect])
      }

      if (result[STORAGE_KEYS.language]) {
        setLanguage(result[STORAGE_KEYS.language])
      }

      console.log("[Turbo‑Vecter] Loaded settings", {
        effect: result[STORAGE_KEYS.effect],
        language: result[STORAGE_KEYS.language]
      })
    })
  }, [storage])

  useEffect(() => {
    console.log("[Turbo‑Vecter] Saving settings", {
      effect,
      language
    })
    if (!storage) {
        console.warn("[Turbo‑Vecter] Storage API not available, settings will not be saved.")
      return
    }

    storage.set({
      [STORAGE_KEYS.effect]: effect,
      [STORAGE_KEYS.language]: language
    })

    console.log("[Turbo‑Vecter] Saved settings", {
      effect,
      language
    })
  }, [effect, language, storage])

  const labels = useMemo(
    () =>
      language === "zh"
        ? {
            title: "矢量涡轮控制面板",
            subtitle: "选择光标能量效果",
            language: "语言",
            options: {
              off: "关闭",
              magnetic: "磁",
              light: "光",
              electric: "电"
            }
          }
        : {
            title: "Turbo‑Vecter Control Panel",
            subtitle: "Select a cursor energy effect",
            language: "Language",
            options: {
              off: "Off",
              magnetic: "Magnetic",
              light: "Light",
              electric: "Electric"
            }
          },
    [language]
  )

  return (
    <div
      style={{
        minWidth: 460,
        padding: 20,
        borderRadius: 18,
        background:
          "radial-gradient(120% 120% at 10% 0%, #18244A 0%, #0B1025 55%, #0A0F24 100%)",
        color: "#E6F4FF",
        border: "1px solid rgba(125, 227, 255, 0.35)",
        boxShadow:
          "0 0 0 1px rgba(124, 142, 255, 0.3), 0 12px 30px rgba(10, 15, 36, 0.6)"
      }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 4px 14px",
          marginBottom: 10
        }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{labels.title}</div>
          <div style={{ fontSize: 14, opacity: 0.75, marginTop: 6 }}>
            {labels.subtitle}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 12,
            opacity: 0.9
          }}>
          {labels.language}
          <button
            type="button"
            role="switch"
            aria-checked={language === "zh"}
            onClick={() =>
              setLanguage((value) => (value === "en" ? "zh" : "en"))
            }
            style={{
              position: "relative",
              width: 54,
              height: 28,
              borderRadius: 999,
              padding: 0,
              background:
                language === "zh"
                  ? "rgba(125, 227, 255, 0.45)"
                  : "rgba(125, 227, 255, 0.2)",
              border: "1px solid rgba(125, 227, 255, 0.55)",
              cursor: "pointer"
            }}>
            <span
              style={{
                position: "absolute",
                top: 3,
                left: language === "zh" ? 28 : 4,
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#E6F4FF",
                boxShadow:
                  "0 2px 6px rgba(0, 0, 0, 0.35), inset 0 0 6px rgba(125, 227, 255, 0.7)"
              }}
            />
            <span
              style={{
                position: "absolute",
                top: "50%",
                left: 8,
                transform: "translateY(-50%)",
                fontSize: 10,
                opacity: language === "zh" ? 0.5 : 0.95
              }}>
              EN
            </span>
            <span
              style={{
                position: "absolute",
                top: "50%",
                right: 8,
                transform: "translateY(-50%)",
                fontSize: 10,
                opacity: language === "zh" ? 0.95 : 0.5
              }}>
              中
            </span>
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          padding: 16,
          marginTop: 6,
          borderRadius: 12,
          background: "rgba(10, 15, 36, 0.5)",
          border: "1px solid rgba(125, 227, 255, 0.2)"
        }}>
        {(
          [
            { value: "off", label: labels.options.off },
            { value: "magnetic", label: labels.options.magnetic },
            { value: "light", label: labels.options.light },
            { value: "electric", label: labels.options.electric }
          ] as Array<{ value: EffectOption; label: string }>
        ).map((option) => (
          <label
            key={option.value}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              borderRadius: 10,
              background:
                effect === option.value
                  ? "rgba(125, 227, 255, 0.18)"
                  : "transparent",
              border:
                effect === option.value
                  ? "1px solid rgba(125, 227, 255, 0.65)"
                  : "1px solid rgba(125, 227, 255, 0.15)",
              cursor: "pointer"
            }}>
            <input
              type="radio"
              name="effect"
              value={option.value}
              checked={effect === option.value}
              onChange={() => setEffect(option.value)}
              style={{ accentColor: "#7DE3FF" }}
            />
            <span style={{ fontSize: 14 }}>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

export default Popup
