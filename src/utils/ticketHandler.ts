/**
 * @fileoverview Gestor de entrada de tickets para autenticación CHAP.
 * Maneja validación, hashing MD5 y redirección con credenciales.
 */

import { hexMD5 } from "./md5";

/** Configuración por defecto del validador de tickets */
const DEFAULT_MIN_LENGTH = 4;
const DEFAULT_DELAY_MS = 3000;

/**
 * Interfaz para la configuración de variables CHAP.
 */
interface ChapConfig {
  /** Desafío CHAP del servidor */
  chapChallenge: string;
  /** URL de login solo con usuario */
  linkLoginOnly: string;
  /** Destino original de la solicitud */
  linkOrig: string;
  /** ID del desafío CHAP */
  chapId: string;
}

/**
 * Interfaz para los elementos DOM requeridos.
 */
interface DomElements {
  input: HTMLInputElement;
  button: HTMLButtonElement;
  errorMsg: HTMLElement;
  hintMsg: HTMLElement;
  loader: HTMLElement;
  container: HTMLElement;
}

/**
 * Obtiene las variables de configuración CHAP del contenedor.
 * @param {HTMLElement} container - Elemento contenedor con atributos data-*
 * @returns {ChapConfig} Configuración CHAP extraída
 */
function getChapConfig(container: HTMLElement): ChapConfig {
  const chapChallenge = container.getAttribute("data-chap-challenge");
  const linkLoginOnly = container.getAttribute("data-link-login-only");
  const linkOrig = container.getAttribute("data-link-orig");
  const chapId = container.getAttribute("data-chap-id");

  return {
    chapChallenge:
      !chapChallenge || chapChallenge === "$(chap-challenge)"
        ? ""
        : chapChallenge,
    linkLoginOnly:
      !linkLoginOnly || linkLoginOnly === "$(link-login-only)"
        ? ""
        : linkLoginOnly,
    linkOrig: !linkOrig || linkOrig === "$(link-orig)" ? "" : linkOrig,
    chapId: !chapId || chapId === "$(chap-id)" ? "" : chapId,
  };
}

/**
 * Obtiene todos los elementos DOM necesarios para el funcionamiento.
 * @returns {DomElements} Objeto con referencias a los elementos DOM
 * @throws {Error} Si no se encuentran elementos requeridos
 */
function getDomElements(): DomElements {
  const input = document.querySelector<HTMLInputElement>(
    'input[placeholder="Ticket o PIN"]'
  );
  const button = document.querySelector<HTMLButtonElement>("#submit-btn");
  const errorMsg = document.querySelector<HTMLElement>(".error-message");
  const hintMsg = document.querySelector<HTMLElement>(".hint-text");
  const loader = document.querySelector<HTMLElement>("#loader-overlay");
  const container = document.querySelector<HTMLElement>(
    "[data-chap-challenge]"
  );

  if (!input || !button || !errorMsg || !hintMsg || !loader || !container) {
    throw new Error("No se encontraron todos los elementos DOM requeridos");
  }

  return { input, button, errorMsg, hintMsg, loader, container };
}

/**
 * Actualiza el estado visual del botón y mensajes según el contenido del input.
 * @param {HTMLInputElement} input - Elemento input
 * @param {HTMLButtonElement} button - Botón de envío
 * @param {HTMLElement} errorMsg - Elemento de mensaje de error
 * @param {HTMLElement} hintMsg - Elemento de mensaje de ayuda
 * @param {number} minLength - Longitud mínima requerida
 */
function updateState(
  input: HTMLInputElement,
  button: HTMLButtonElement,
  errorMsg: HTMLElement,
  hintMsg: HTMLElement,
  minLength: number
): void {
  const isValid = input.value.length >= minLength;
  button.disabled = !isValid;

  if (input.value.length > 0 && input.value.length < minLength) {
    errorMsg.textContent = `⚠️ Mínimo ${minLength} caracteres (tienes ${input.value.length})`;
    errorMsg.classList.remove("hidden");
    hintMsg.classList.add("hidden");
  } else {
    errorMsg.classList.add("hidden");
    hintMsg.classList.remove("hidden");
  }
}

/**
 * Muestra el overlay de carga con animación.
 * @param {HTMLElement} loader - Elemento loader a mostrar
 */
function showLoader(loader: HTMLElement): void {
  loader.classList.remove("hidden");
  loader.classList.add("show");
}

/**
 * Calcula la contraseña usando autenticación CHAP.
 * Genera hash MD5 de: chapId + contraseña + chapChallenge
 * @param {string} password - Contraseña (ticket/PIN)
 * @param {ChapConfig} chapConfig - Configuración CHAP
 * @returns {string} Contraseña calculada (MD5 o texto plano si no hay CHAP)
 */
function calculatePassword(password: string, chapConfig: ChapConfig): string {
  if (chapConfig.chapId) {
    return hexMD5(chapConfig.chapId + password + chapConfig.chapChallenge);
  }
  return password;
}

/**
 * Valida que la URL sea válida (no sea placeholder del servidor).
 * @param {string} url - URL a validar
 * @returns {boolean} True si es una URL válida
 * @private
 */
function isValidUrl(url: string): boolean {
  return !url.includes("$(") && !url.includes(")");
}

/**
 * Muestra un toast de notificación en el frontend.
 * Permanece visible hasta que el usuario presione el botón de cierre (X).
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de notificación ('error', 'success', 'warning')
 */
function showToast(
  message: string,
  type: "error" | "success" | "warning" = "error"
): void {
  const toast = document.createElement("div");
  toast.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-white z-50 flex items-center gap-3`;

  const colorMap = {
    error: "bg-red-500",
    success: "bg-green-500",
    warning: "bg-yellow-500",
  };

  toast.classList.add(colorMap[type]);
  toast.style.animation = "slideIn 0.3s ease-out";

  // Contenedor del mensaje
  const messageSpan = document.createElement("span");
  messageSpan.textContent = message;
  messageSpan.style.flex = "1";

  // Botón de cierre
  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "✕";
  closeBtn.style.cssText = `
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 1.25rem;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.8;
    transition: opacity 0.2s;
  `;

  closeBtn.addEventListener("mouseover", () => {
    closeBtn.style.opacity = "1";
  });

  closeBtn.addEventListener("mouseout", () => {
    closeBtn.style.opacity = "0.8";
  });

  closeBtn.addEventListener("click", () => {
    toast.style.animation = "slideOut 0.3s ease-in forwards";
    setTimeout(() => toast.remove(), 300);
  });

  toast.appendChild(messageSpan);
  toast.appendChild(closeBtn);
  document.body.appendChild(toast);
}

/**
 * Realiza la redirección al servidor de login.
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña (puede ser hash MD5)
 * @param {ChapConfig} chapConfig - Configuración CHAP
 * @param {DomElements} elements - Referencias a elementos DOM (para desactivar loader en error)
 * @returns {boolean} True si la redirección fue exitosa, false si hubo error
 */
function redirectToLogin(
  username: string,
  password: string,
  chapConfig: ChapConfig,
  elements: DomElements
): boolean {
  // Validar que las URLs sean válidas
  if (!isValidUrl(chapConfig.linkLoginOnly)) {
    hideLoader(elements.loader);
    elements.button.disabled = false;
    elements.input.disabled = false;

    showToast(
      "⚠️ Error: URL de login no configurada. Contacte al administrador.",
      "error"
    );
    console.error("Invalid linkLoginOnly:", chapConfig.linkLoginOnly);
    return false;
  }

  try {
    const url = new URL(chapConfig.linkLoginOnly);
    url.searchParams.append("username", username);
    url.searchParams.append("password", password);
    chapConfig.linkOrig && url.searchParams.append("dst", chapConfig.linkOrig);
    url.searchParams.append("popup", "false");

    window.location.href = url.toString();
    return true;
  } catch (error) {
    hideLoader(elements.loader);
    elements.button.disabled = false;
    elements.input.disabled = false;

    showToast(
      "❌ Error al procesar la solicitud. Intenta nuevamente.",
      "error"
    );
    console.error("Error constructing redirect URL:", error);
    return false;
  }
}

/**
 * Oculta el overlay de carga.
 * @param {HTMLElement} loader - Elemento loader a ocultar
 */
function hideLoader(loader: HTMLElement): void {
  loader.classList.remove("show");
  loader.classList.add("hidden");
}

/**
 * Valida el ticket/PIN ingresado.
 * @param {string} value - Valor a validar
 * @param {number} minLength - Longitud mínima
 * @returns {boolean} True si es válido
 */
function isValidTicket(value: string, minLength: number): boolean {
  return value.trim().length >= minLength;
}

/**
 * Maneja el evento de envío del formulario.
 * @param {DomElements} elements - Referencias a elementos DOM
 * @param {ChapConfig} chapConfig - Configuración CHAP
 * @param {number} minLength - Longitud mínima
 * @param {number} delayMs - Retardo antes de redireccionar
 */
function handleSubmit(
  elements: DomElements,
  chapConfig: ChapConfig,
  minLength: number,
  delayMs: number
): void {
  const { input, button, errorMsg, hintMsg, loader } = elements;

  if (!isValidTicket(input.value, minLength)) {
    errorMsg.textContent = `⚠️ Debes ingresar mínimo ${minLength} caracteres`;
    errorMsg.classList.remove("hidden");
    hintMsg.classList.add("hidden");
    return;
  }

  showLoader(loader);
  button.disabled = true;
  input.disabled = true;

  setTimeout(() => {
    try {
      const password = calculatePassword("", chapConfig); // se envia vacío porque se usa solo chapId + chapChallenge
      redirectToLogin(input.value, password, chapConfig, elements);
    } catch (error) {
      // Mostrar error y permitir reintentar
      hideLoader(loader);
      button.disabled = false;
      input.disabled = false;

      showToast(
        "❌ Error al procesar la solicitud. Intenta nuevamente.",
        "error"
      );
      console.error("Error en handleSubmit:", error);
    }
  }, delayMs);
}

/**
 * Inicializa el gestor de entrada de tickets.
 * Configura event listeners y estado inicial.
 * Detecta y muestra errores del servidor si existen.
 * @param {Object} options - Opciones de configuración
 * @param {number} [options.minLength=4] - Longitud mínima requerida
 * @param {number} [options.delayMs=3000] - Retardo antes de redireccionar
 */
export function initTicketHandler(
  options: { minLength?: number; delayMs?: number } = {}
): void {
  const minLength = options.minLength ?? DEFAULT_MIN_LENGTH;
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;

  try {
    const elements = getDomElements();
    const chapConfig = getChapConfig(elements.container);

    // Detectar y mostrar error del servidor si existe
    const serverError = elements.container.getAttribute("data-error");
    if (
      serverError &&
      serverError !== "$(error)" &&
      serverError.trim() !== ""
    ) {
      showToast(`⚠️ ${serverError}`, "error");
    }

    // Actualizar estado inicial
    updateState(
      elements.input,
      elements.button,
      elements.errorMsg,
      elements.hintMsg,
      minLength
    );

    // Event listeners
    elements.input.addEventListener("input", () =>
      updateState(
        elements.input,
        elements.button,
        elements.errorMsg,
        elements.hintMsg,
        minLength
      )
    );

    elements.button.addEventListener("click", () =>
      handleSubmit(elements, chapConfig, minLength, delayMs)
    );

    elements.input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        handleSubmit(elements, chapConfig, minLength, delayMs);
      }
    });
  } catch (error) {
    console.error("Error inicializando TicketHandler:", error);
  }
}
