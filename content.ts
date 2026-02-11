import setupCursorEffects from "./content/index"

export const config = {
  matches: ["<all_urls>"]
}

try {
  document.documentElement.setAttribute("data-turbo-vecter", "loaded")
} catch (error) {
  console.warn("[Turbo‑Vecter] Failed to tag document", error)
}

console.log("[Turbo‑Vecter] content.ts loaded")

const init = () => {
  console.log("[Turbo‑Vecter] content.ts init")
  try {
    document.documentElement.setAttribute("data-turbo-vecter-init", "called")
    setupCursorEffects()
    document.documentElement.setAttribute("data-turbo-vecter-init", "success")
  } catch (error) {
    document.documentElement.setAttribute("data-turbo-vecter-init", "error")
    document.documentElement.setAttribute(
      "data-turbo-vecter-error",
      String(error)
    )
    console.warn("[Turbo‑Vecter] init failed", error)
  }
}

init()

export default init
