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

// Handle extension context invalidation errors globally
const handleContextError = (error: ErrorEvent) => {
  if (error.message?.includes?.("context invalidated")) {
    console.warn("[Turbo‑Vecter] Extension context invalidated (expected on reload)")
    error.preventDefault()
    return true
  }
  return false
}

window.addEventListener("error", (event) => {
  handleContextError(event)
}, true)

window.addEventListener("unhandledrejection", (event) => {
  if (event.reason?.message?.includes?.("context invalidated")) {
    console.warn("[Turbo‑Vecter] Extension context invalidated in promise (expected on reload)")
    event.preventDefault()
  }
}, true)

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
