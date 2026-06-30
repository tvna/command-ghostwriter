/* @ds-bundle: {"format":3,"namespace":"CommandGhostwriterDesignSystem_0d5f31","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Divider","sourcePath":"components/core/Divider.jsx"},{"name":"Alert","sourcePath":"components/feedback/Alert.jsx"},{"name":"CodeBlock","sourcePath":"components/feedback/CodeBlock.jsx"},{"name":"FileUploader","sourcePath":"components/forms/FileUploader.jsx"},{"name":"RadioGroup","sourcePath":"components/forms/RadioGroup.jsx"},{"name":"Selectbox","sourcePath":"components/forms/Selectbox.jsx"},{"name":"TextArea","sourcePath":"components/forms/TextArea.jsx"},{"name":"TextInput","sourcePath":"components/forms/TextInput.jsx"},{"name":"Toggle","sourcePath":"components/forms/Toggle.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"9a63297e1e69","components/core/Button.jsx":"2544f7cfa81f","components/core/Card.jsx":"17c5c6bcade6","components/core/Divider.jsx":"0b26b70284a1","components/feedback/Alert.jsx":"4565025e3177","components/feedback/CodeBlock.jsx":"64a3fd38c744","components/forms/FileUploader.jsx":"9aeece62b3d7","components/forms/RadioGroup.jsx":"956f63824358","components/forms/Selectbox.jsx":"4312eb472d3e","components/forms/TextArea.jsx":"72f856b13d7e","components/forms/TextInput.jsx":"664c9614e7be","components/forms/Toggle.jsx":"43bb06520b8c","components/navigation/Tabs.jsx":"84df2f74f1cd","redesign/CodeView.jsx":"49948546faa5","redesign/Editor.jsx":"0cfb735826b6","redesign/EmptyState.jsx":"572a9341fed8","redesign/Icon.jsx":"c63e5588b5a2","redesign/Library.jsx":"1a1ffbd2666b","redesign/SettingsModal.jsx":"48a72ab673f4","redesign/data.js":"9901abbd820c","redesign/engine.js":"6bcbe2ce71cd","redesign/templates.js":"f977d126967a","ui_kits/command-ghostwriter/App.jsx":"405428ba8296","ui_kits/command-ghostwriter/DebugTab.jsx":"a3cec015c8b7","ui_kits/command-ghostwriter/GenerateTab.jsx":"01c633a53078","ui_kits/command-ghostwriter/SamplesTab.jsx":"832ff570da90","ui_kits/command-ghostwriter/SettingsTab.jsx":"86f592f755d3","ui_kits/command-ghostwriter/Sidebar.jsx":"0aa44b376094","ui_kits/command-ghostwriter/WorkflowTab.jsx":"fa7265684de4"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.CommandGhostwriterDesignSystem_0d5f31 = window.CommandGhostwriterDesignSystem_0d5f31 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Badge — small status pill. Defaults to a neutral chip; semantic
 * tones reuse the Streamlit alert palette.
 */
function Badge({
  children,
  tone = 'neutral',
  style,
  ...rest
}) {
  const tones = {
    neutral: {
      background: 'var(--surface-raised)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border-default)'
    },
    brand: {
      background: 'rgba(255,75,75,.14)',
      color: 'var(--cg-red-tint)',
      border: '1px solid var(--cg-error-border)'
    },
    success: {
      background: 'var(--cg-success-bg)',
      color: 'var(--cg-success)',
      border: '1px solid var(--cg-success-border)'
    },
    warning: {
      background: 'var(--cg-warning-bg)',
      color: 'var(--cg-warning)',
      border: '1px solid var(--cg-warning-border)'
    },
    error: {
      background: 'var(--cg-error-bg)',
      color: 'var(--cg-error)',
      border: '1px solid var(--cg-error-border)'
    },
    info: {
      background: 'var(--cg-info-bg)',
      color: 'var(--cg-info)',
      border: '1px solid var(--cg-info-border)'
    }
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-1)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-semibold)',
      lineHeight: 1,
      padding: '4px 10px',
      borderRadius: 'var(--radius-pill)',
      whiteSpace: 'nowrap',
      ...(tones[tone] || tones.neutral),
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Button — Command Ghostwriter's primary action control.
 * Mirrors Streamlit's st.button: full-radius corners, Source Sans label,
 * brand-red primary. Lightens on hover, deepens on press.
 */
function Button({
  children,
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  icon = null,
  type = 'button',
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const sizes = {
    sm: {
      fontSize: 'var(--text-sm)',
      padding: '4px 12px',
      minHeight: 32
    },
    md: {
      fontSize: 'var(--text-base)',
      padding: '7px 16px',
      minHeight: 40
    },
    lg: {
      fontSize: 'var(--text-md)',
      padding: '10px 22px',
      minHeight: 46
    }
  };
  const palettes = {
    primary: {
      base: {
        background: 'var(--cg-red)',
        color: '#fff',
        border: '1px solid var(--cg-red)'
      },
      hover: {
        background: 'var(--cg-red-hover)',
        borderColor: 'var(--cg-red-hover)'
      },
      active: {
        background: 'var(--cg-red-active)',
        borderColor: 'var(--cg-red-active)'
      }
    },
    secondary: {
      base: {
        background: 'var(--surface-raised)',
        color: 'var(--text-body)',
        border: '1px solid var(--border-default)'
      },
      hover: {
        borderColor: 'var(--cg-red)',
        color: 'var(--cg-red)'
      },
      active: {
        background: 'var(--surface-hover)'
      }
    },
    ghost: {
      base: {
        background: 'transparent',
        color: 'var(--text-body)',
        border: '1px solid transparent'
      },
      hover: {
        background: 'var(--surface-raised)'
      },
      active: {
        background: 'var(--surface-hover)'
      }
    }
  };
  const p = palettes[variant] || palettes.secondary;
  const composed = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    width: fullWidth ? '100%' : 'auto',
    fontFamily: 'var(--font-sans)',
    fontWeight: 'var(--weight-semibold)',
    lineHeight: 1,
    borderRadius: 'var(--radius-md)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    transition: 'background var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard), color var(--dur-base) var(--ease-standard)',
    ...sizes[size],
    ...p.base,
    ...(!disabled && hover ? p.hover : null),
    ...(!disabled && active ? p.active : null),
    ...style
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false),
    style: composed
  }, rest), icon && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      fontSize: '1.1em'
    }
  }, icon), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Card — Streamlit's bordered container (st.container(border=True)).
 * A subtly-raised surface with a 1px border and soft radius.
 */
function Card({
  children,
  padding = 'var(--space-6)',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      padding,
      color: 'var(--text-body)',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Divider.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Divider — a horizontal rule. The signature "rainbow" variant
 * recreates Streamlit's st.subheader(divider="rainbow"); "subtle"
 * is a plain hairline.
 */
function Divider({
  variant = 'rainbow',
  style,
  ...rest
}) {
  const variants = {
    rainbow: {
      height: 'var(--divider-height)',
      background: 'var(--cg-rainbow)',
      borderRadius: 'var(--radius-pill)'
    },
    subtle: {
      height: '1px',
      background: 'var(--border-default)'
    },
    red: {
      height: 'var(--divider-height)',
      background: 'var(--cg-red)',
      borderRadius: 'var(--radius-pill)'
    }
  };
  return /*#__PURE__*/React.createElement("hr", _extends({
    style: {
      border: 0,
      margin: 'var(--space-3) 0',
      width: '100%',
      ...(variants[variant] || variants.rainbow),
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Divider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Divider.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Alert.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Alert — Streamlit's st.success / st.warning / st.error / st.info.
 * A tinted bar with a leading icon and a left accent stripe.
 */
function Alert({
  children,
  tone = 'info',
  icon,
  style,
  ...rest
}) {
  const tones = {
    success: {
      color: 'var(--cg-success)',
      bg: 'var(--cg-success-bg)',
      border: 'var(--cg-success-border)',
      icon: '✓'
    },
    warning: {
      color: 'var(--cg-warning)',
      bg: 'var(--cg-warning-bg)',
      border: 'var(--cg-warning-border)',
      icon: '⚠'
    },
    error: {
      color: 'var(--cg-error)',
      bg: 'var(--cg-error-bg)',
      border: 'var(--cg-error-border)',
      icon: '⛔'
    },
    info: {
      color: 'var(--cg-info)',
      bg: 'var(--cg-info-bg)',
      border: 'var(--cg-info-border)',
      icon: 'ℹ'
    }
  };
  const t = tones[tone] || tones.info;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "status",
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-3)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-body)',
      background: t.bg,
      border: `1px solid ${t.border}`,
      borderLeft: `3px solid ${t.color}`,
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-3) var(--space-4)',
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      color: t.color,
      fontWeight: 700,
      lineHeight: 'var(--leading-snug)',
      flexShrink: 0
    }
  }, icon || t.icon), /*#__PURE__*/React.createElement("span", {
    style: {
      lineHeight: 'var(--leading-snug)'
    }
  }, children));
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Alert.jsx", error: String((e && e.message) || e) }); }

// components/feedback/CodeBlock.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * CodeBlock — a sunken monospace well for CLI output, config, or Jinja
 * templates. Optional title bar with a copy affordance and language tag.
 */
function CodeBlock({
  children,
  title,
  language,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: 'var(--surface-sunken)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      fontFamily: 'var(--font-mono)',
      ...style
    }
  }, rest), (title || language) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '7px 12px',
      borderBottom: '1px solid var(--border-default)',
      background: 'var(--surface-raised)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-xs)',
      color: 'var(--text-secondary)'
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)'
    }
  }, language && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-2xs)',
      color: 'var(--text-disabled)',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)'
    }
  }, language), /*#__PURE__*/React.createElement("span", {
    title: "Copy",
    style: {
      cursor: 'pointer',
      color: 'var(--text-secondary)',
      fontSize: 13
    }
  }, "\u29C9"))), /*#__PURE__*/React.createElement("pre", {
    style: {
      margin: 0,
      padding: 'var(--space-4)',
      fontSize: '13px',
      lineHeight: 'var(--leading-code)',
      color: 'var(--text-body)',
      overflowX: 'auto',
      whiteSpace: 'pre'
    }
  }, children));
}
Object.assign(__ds_scope, { CodeBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/CodeBlock.jsx", error: String((e && e.message) || e) }); }

// components/forms/FileUploader.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * FileUploader — recreates Streamlit's st.file_uploader dropzone.
 * Dashed border, cloud prompt, type/size limits, and an optional
 * "uploaded file" row once a name is provided.
 */
function FileUploader({
  label,
  accept = '',
  maxSize = '30MB',
  fileName = null,
  fileSize = '',
  onBrowse,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, rest), label && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-body)',
      marginBottom: 'var(--space-2)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)',
      background: 'var(--surface-raised)',
      border: `1px dashed ${hover ? 'var(--cg-red)' : 'var(--border-default)'}`,
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4) var(--space-5)',
      transition: 'border-color var(--dur-base) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "24",
    height: "24",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "var(--cg-red)",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flexShrink: 0,
      opacity: 0.9
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M7 18.5 A4 4 0 0 1 6.5 10.6 A5.2 5.2 0 0 1 16.2 9.4 A3.6 3.6 0 0 1 17 18.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 12.5 v6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9.5 15 L12 12.5 L14.5 15"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-body)'
    }
  }, "Drag and drop file here"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'var(--text-secondary)',
      marginTop: 2
    }
  }, "Limit ", maxSize, " per file", accept ? ` · ${accept}` : '')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onBrowse,
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--text-body)',
      background: 'var(--surface-app)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      padding: '6px 14px',
      cursor: 'pointer',
      whiteSpace: 'nowrap'
    }
  }, "Browse files")), fileName && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      marginTop: 'var(--space-2)',
      padding: 'var(--space-2) var(--space-3)',
      fontSize: 'var(--text-sm)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      flexShrink: 0,
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M6 3 h7 l5 5 v12 a1 1 0 0 1 -1 1 H6 a1 1 0 0 1 -1 -1 V4 a1 1 0 0 1 1 -1 Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M13 3 v5 h5"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      color: 'var(--text-body)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, fileName), fileSize && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-secondary)',
      fontSize: 'var(--text-xs)'
    }
  }, fileSize), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-secondary)',
      cursor: 'pointer',
      fontSize: 18,
      lineHeight: 1
    }
  }, "\xD7")));
}
Object.assign(__ds_scope, { FileUploader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FileUploader.jsx", error: String((e && e.message) || e) }); }

// components/forms/RadioGroup.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * RadioGroup — Streamlit's st.radio. Horizontal or vertical set of
 * single-choice options with a red filled dot when selected.
 */
function RadioGroup({
  label,
  value,
  options = [],
  horizontal = false,
  onChange,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, rest), label && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--text-body)',
      marginBottom: 'var(--space-2)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: horizontal ? 'row' : 'column',
      gap: horizontal ? 'var(--space-5)' : 'var(--space-2)'
    }
  }, options.map(opt => {
    const selected = opt === value;
    return /*#__PURE__*/React.createElement("label", {
      key: opt,
      onClick: () => onChange && onChange(opt),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        cursor: 'pointer',
        fontSize: 'var(--text-sm)',
        color: 'var(--text-body)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 18,
        height: 18,
        borderRadius: '50%',
        flexShrink: 0,
        border: `2px solid ${selected ? 'var(--cg-red)' : 'var(--cg-border-strong)'}`,
        display: 'grid',
        placeItems: 'center',
        transition: 'border-color var(--dur-base)'
      }
    }, selected && /*#__PURE__*/React.createElement("span", {
      style: {
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: 'var(--cg-red)'
      }
    })), opt);
  })));
}
Object.assign(__ds_scope, { RadioGroup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/RadioGroup.jsx", error: String((e && e.message) || e) }); }

// components/forms/Selectbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Selectbox — Streamlit's st.selectbox. A button-like field showing the
 * current value with a chevron. Click toggles a simple option list.
 */
function Selectbox({
  label,
  value,
  options = [],
  disabled = false,
  onChange,
  style,
  ...rest
}) {
  const [open, setOpen] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", _extends({
    style: {
      display: 'block',
      position: 'relative',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, rest), label && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-body)',
      marginBottom: 'var(--space-2)'
    }
  }, label), /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: disabled,
    onClick: () => setOpen(o => !o),
    style: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 'var(--space-3)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      color: 'var(--text-body)',
      background: 'var(--surface-raised)',
      border: `1px solid ${open ? 'var(--cg-red)' : 'var(--cg-border-input)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '8px 12px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, value), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--text-secondary)',
      transform: open ? 'rotate(180deg)' : 'none',
      transition: 'transform var(--dur-base)'
    }
  }, "\u25BE")), open && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      zIndex: 20,
      top: 'calc(100% + 4px)',
      left: 0,
      right: 0,
      background: 'var(--surface-raised)',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-lg)',
      overflow: 'hidden',
      padding: 'var(--space-1)'
    }
  }, options.map(opt => {
    const selected = opt === value;
    return /*#__PURE__*/React.createElement("div", {
      key: opt,
      onClick: () => {
        onChange && onChange(opt);
        setOpen(false);
      },
      style: {
        fontSize: 'var(--text-sm)',
        color: selected ? 'var(--cg-red)' : 'var(--text-body)',
        background: selected ? 'rgba(255,75,75,.10)' : 'transparent',
        borderRadius: 'var(--radius-sm)',
        padding: '7px 10px',
        cursor: 'pointer'
      },
      onMouseEnter: e => {
        if (!selected) e.currentTarget.style.background = 'var(--surface-hover)';
      },
      onMouseLeave: e => {
        if (!selected) e.currentTarget.style.background = 'transparent';
      }
    }, opt);
  })));
}
Object.assign(__ds_scope, { Selectbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Selectbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/TextArea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * TextArea — Streamlit's st.text_area, also used to render generated
 * CLI output. Monospace by default since it usually holds commands.
 */
function TextArea({
  label,
  value,
  rows = 8,
  mono = true,
  readOnly = false,
  onChange,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-body)',
      marginBottom: 'var(--space-2)'
    }
  }, label), /*#__PURE__*/React.createElement("textarea", _extends({
    value: value,
    rows: rows,
    readOnly: readOnly,
    onChange: e => onChange && onChange(e.target.value),
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      width: '100%',
      boxSizing: 'border-box',
      resize: 'vertical',
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
      fontSize: mono ? '13px' : 'var(--text-base)',
      lineHeight: 'var(--leading-code)',
      color: 'var(--text-body)',
      background: 'var(--surface-sunken)',
      border: `1px solid ${focus ? 'var(--cg-red)' : 'var(--cg-border-input)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '10px 12px',
      outline: 'none',
      boxShadow: focus ? 'var(--shadow-focus)' : 'none',
      transition: 'border-color var(--dur-base), box-shadow var(--dur-base)'
    }
  }, rest)));
}
Object.assign(__ds_scope, { TextArea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TextArea.jsx", error: String((e && e.message) || e) }); }

// components/forms/TextInput.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * TextInput — Streamlit's st.text_input. Label above a filled field
 * that gains a red ring on focus.
 */
function TextInput({
  label,
  value,
  placeholder = '',
  disabled = false,
  onChange,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'block',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-body)',
      marginBottom: 'var(--space-2)'
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    type: "text",
    value: value,
    placeholder: placeholder,
    disabled: disabled,
    onChange: e => onChange && onChange(e.target.value),
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      width: '100%',
      boxSizing: 'border-box',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      color: 'var(--text-body)',
      background: 'var(--surface-raised)',
      border: `1px solid ${focus ? 'var(--cg-red)' : 'var(--cg-border-input)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '8px 12px',
      outline: 'none',
      boxShadow: focus ? 'var(--shadow-focus)' : 'none',
      transition: 'border-color var(--dur-base), box-shadow var(--dur-base)'
    }
  }, rest)));
}
Object.assign(__ds_scope, { TextInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TextInput.jsx", error: String((e && e.message) || e) }); }

// components/forms/Toggle.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Toggle — Streamlit's st.toggle. A pill switch with the knob sliding
 * onto brand red when on. Optional label sits to the right.
 */
function Toggle({
  checked = false,
  label,
  disabled = false,
  onChange,
  style,
  ...rest
}) {
  const toggle = () => {
    if (!disabled && onChange) onChange(!checked);
  };
  return /*#__PURE__*/React.createElement("label", _extends({
    onClick: toggle,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      color: 'var(--text-body)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      width: 40,
      height: 22,
      flexShrink: 0,
      borderRadius: 'var(--radius-pill)',
      background: checked ? 'var(--cg-red)' : 'var(--cg-border-strong)',
      transition: 'background var(--dur-base) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 2,
      left: checked ? 20 : 2,
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: '#fff',
      boxShadow: 'var(--shadow-sm)',
      transition: 'left var(--dur-base) var(--ease-standard)'
    }
  })), label && /*#__PURE__*/React.createElement("span", null, label));
}
Object.assign(__ds_scope, { Toggle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Toggle.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Tabs — Streamlit's st.tabs. A horizontal row of emoji-labelled tabs
 * with a red underline on the active item. Controlled or uncontrolled.
 */
function Tabs({
  tabs = [],
  value,
  defaultValue,
  onChange,
  style,
  ...rest
}) {
  const [internal, setInternal] = React.useState(defaultValue ?? (tabs[0] && tabs[0].id));
  const active = value !== undefined ? value : internal;
  const select = id => {
    if (value === undefined) setInternal(id);
    if (onChange) onChange(id);
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "tablist",
    style: {
      display: 'flex',
      gap: 'var(--space-5)',
      borderBottom: '1px solid var(--border-default)',
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, rest), tabs.map(t => {
    const isActive = t.id === active;
    return /*#__PURE__*/React.createElement("button", {
      key: t.id,
      role: "tab",
      "aria-selected": isActive,
      onClick: () => select(t.id),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-base)',
        fontWeight: isActive ? 'var(--weight-semibold)' : 'var(--weight-regular)',
        color: isActive ? 'var(--text-body)' : 'var(--text-secondary)',
        padding: '10px 2px',
        marginBottom: -1,
        borderBottom: `2px solid ${isActive ? 'var(--cg-red)' : 'transparent'}`,
        transition: 'color var(--dur-base)',
        whiteSpace: 'nowrap'
      }
    }, t.icon && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: '1.05em'
      }
    }, t.icon), t.label);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// redesign/CodeView.jsx
try { (() => {
/* global React */
// CodeView — a line-numbered, syntax-highlighted read-only code surface for the
// redesigned editor. Lightweight regex tokenizer; languages: toml, jinja, bash, json.

const CV_COLORS = {
  comment: 'var(--cg-text-faint)',
  string: '#7CD992',
  number: '#5AB9F0',
  bool: '#5AB9F0',
  key: '#FF8C8C',
  section: '#FFBD45',
  expr: '#FF8C8C',
  stmt: '#FFBD45',
  ip: '#5AB9F0'
};
const CV_REGEX = {
  toml: /(#.*$)|(\[[^\]]*\])|("(?:[^"\\]|\\.)*")|(\b(?:true|false)\b)|(\b\d[\d.]*\b)|([A-Za-z0-9_."]+)(?=\s*=)/g,
  jinja: /(\{#[\s\S]*?#\})|(\{\{[\s\S]*?\}\})|(\{%[\s\S]*?%\})|("(?:[^"\\]|\\.)*")/g,
  bash: /((?:#|!).*$)|("(?:[^"\\]|\\.)*")|(\b\d{1,3}(?:\.\d{1,3}){3}\b)|(\b\d+\b)/g
};
const CV_CLASS = {
  toml: ['comment', 'section', 'string', 'bool', 'number', 'key'],
  jinja: ['comment', 'expr', 'stmt', 'string'],
  bash: ['comment', 'string', 'ip', 'number']
};
function cvTokens(line, lang) {
  if (lang === 'json') return cvJson(line);
  const re = CV_REGEX[lang];
  if (!re) return [{
    t: line
  }];
  re.lastIndex = 0;
  const out = [];
  let last = 0;
  let m;
  while (m = re.exec(line)) {
    if (m.index > last) out.push({
      t: line.slice(last, m.index)
    });
    let gi = 1;
    for (; gi < m.length; gi++) {
      if (m[gi] != null) break;
    }
    out.push({
      t: m[0],
      c: CV_CLASS[lang][gi - 1]
    });
    last = re.lastIndex;
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  if (last < line.length) out.push({
    t: line.slice(last)
  });
  return out;
}
function cvJson(line) {
  const re = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\b\d[\d.]*\b)|\b(true|false|null)\b/g;
  const out = [];
  let last = 0;
  let m;
  while (m = re.exec(line)) {
    if (m.index > last) out.push({
      t: line.slice(last, m.index)
    });
    if (m[1] != null) {
      out.push({
        t: m[1],
        c: m[2] ? 'key' : 'string'
      });
      if (m[2]) out.push({
        t: m[2]
      });
    } else if (m[3] != null) {
      out.push({
        t: m[3],
        c: 'number'
      });
    } else if (m[4] != null) {
      out.push({
        t: m[4],
        c: 'bool'
      });
    }
    last = re.lastIndex;
  }
  if (last < line.length) out.push({
    t: line.slice(last)
  });
  return out;
}
function CodeView({
  code,
  lang,
  errorLine,
  onChange,
  readOnly
}) {
  const lines = code.split('\n');
  const taRef = React.useRef(null);
  const hlRef = React.useRef(null);
  const gutRef = React.useRef(null);
  const editable = !readOnly && typeof onChange === 'function';

  // keep the highlight layer + gutter scroll-locked to the textarea
  const onScroll = () => {
    if (!taRef.current) return;
    const {
      scrollTop,
      scrollLeft
    } = taRef.current;
    if (hlRef.current) {
      hlRef.current.scrollTop = scrollTop;
      hlRef.current.scrollLeft = scrollLeft;
    }
    if (gutRef.current) gutRef.current.scrollTop = scrollTop;
  };
  const PAD = '12px 16px';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      position: 'relative',
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      lineHeight: '20px',
      background: 'var(--cg-bg-code)',
      height: '100%',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: gutRef,
    style: {
      flexShrink: 0,
      textAlign: 'right',
      padding: '12px 10px 12px 14px',
      color: 'var(--cg-text-faint)',
      userSelect: 'none',
      overflow: 'hidden',
      background: 'rgba(255,255,255,.015)',
      borderRight: '1px solid var(--cg-border)'
    }
  }, lines.map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      color: i + 1 === errorLine ? 'var(--cg-red)' : undefined
    }
  }, i + 1))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: hlRef,
    style: {
      position: 'absolute',
      inset: 0,
      padding: PAD,
      whiteSpace: 'pre',
      overflow: editable ? 'hidden' : 'auto',
      color: 'var(--cg-text)',
      pointerEvents: editable ? 'none' : 'auto'
    }
  }, lines.map((line, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      minHeight: 20,
      background: i + 1 === errorLine ? 'var(--cg-error-bg)' : undefined
    }
  }, cvTokens(line, lang).map((tok, j) => /*#__PURE__*/React.createElement("span", {
    key: j,
    style: tok.c ? {
      color: CV_COLORS[tok.c]
    } : undefined
  }, tok.t)), line === '' && /*#__PURE__*/React.createElement("span", null, '\u200b')))), editable && /*#__PURE__*/React.createElement("textarea", {
    ref: taRef,
    value: code,
    spellCheck: false,
    onChange: e => onChange(e.target.value),
    onScroll: onScroll,
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      margin: 0,
      padding: PAD,
      border: 'none',
      outline: 'none',
      resize: 'none',
      background: 'transparent',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      lineHeight: 'inherit',
      whiteSpace: 'pre',
      overflow: 'auto',
      color: 'transparent',
      caretColor: 'var(--cg-text)',
      tabSize: 2
    }
  })));
}
window.CodeView = CodeView;
})(); } catch (e) { __ds_ns.__errors.push({ path: "redesign/CodeView.jsx", error: String((e && e.message) || e) }); }

// redesign/Editor.jsx
try { (() => {
/* global React, CodeView, SettingsModal */
const {
  Button,
  Badge,
  Selectbox
} = window.CommandGhostwriterDesignSystem_0d5f31;
const CG = window.CG;

/* ---- small building blocks ---- */
function Segmented({
  items,
  value,
  onChange
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      background: 'var(--cg-bg)',
      border: '1px solid var(--cg-border)',
      borderRadius: 'var(--radius-md)',
      padding: 3,
      gap: 3
    }
  }, items.map(it => {
    const on = it.id === value;
    return /*#__PURE__*/React.createElement("button", {
      key: it.id,
      onClick: () => onChange(it.id),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)',
        fontWeight: on ? 600 : 400,
        color: on ? '#fff' : 'var(--cg-text-muted)',
        background: on ? 'var(--cg-red)' : 'transparent',
        borderRadius: 'var(--radius-sm)',
        padding: '5px 12px',
        transition: 'background var(--dur-base)',
        whiteSpace: 'nowrap'
      }
    }, it.icon && /*#__PURE__*/React.createElement("span", null, it.icon), it.label);
  }));
}
function PaneHeader({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      padding: '10px 14px',
      borderBottom: '1px solid var(--cg-border)',
      background: 'var(--cg-bg-secondary)',
      minHeight: 30
    }
  }, children);
}
function StatusBar({
  children,
  tone
}) {
  const c = tone === 'ok' ? 'var(--cg-success)' : tone === 'err' ? 'var(--cg-red-tint)' : 'var(--cg-text-muted)';
  const bg = tone === 'err' ? 'var(--cg-error-bg)' : 'var(--cg-bg-secondary)';
  const bd = tone === 'err' ? 'var(--cg-error-border)' : 'var(--cg-border)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      padding: '7px 14px',
      borderTop: `1px solid ${bd}`,
      background: bg,
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-xs)',
      color: c
    }
  }, children);
}

/* ---- main ---- */
function Editor({
  initial,
  onBack
}) {
  const tpl = initial || null;
  const [leftTab, setLeftTab] = React.useState('data');
  const [format, setFormat] = React.useState(tpl && tpl.format || 'toml');
  const [rightMode, setRightMode] = React.useState('md');
  const [enc, setEnc] = React.useState('UTF-8');
  const [settings, setSettings] = React.useState(false);
  const [toast, setToast] = React.useState(null);

  // live, editable input
  const [dataText, setDataText] = React.useState(tpl && tpl.data || CG.configToml);
  const [tplText, setTplText] = React.useState(tpl && tpl.template || CG.templateJ2);
  const fire = msg => {
    setToast(msg);
    clearTimeout(window.__t);
    window.__t = setTimeout(() => setToast(null), 1800);
  };

  // recompute output / variables / validation from the actual input on every edit
  const r = React.useMemo(() => window.CGEngine.compute(dataText, format, tplText), [dataText, format, tplText]);
  const blocked = !r.ok;
  const dataErrLine = r.error && r.error.pane !== 'tpl' ? r.error.line : 0;
  const FORMATS = [{
    id: 'toml',
    label: 'TOML'
  }, {
    id: 'yaml',
    label: 'YAML'
  }, {
    id: 'csv',
    label: 'CSV'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      minHeight: 620,
      minWidth: 1024,
      background: 'var(--cg-bg)',
      fontFamily: 'var(--font-sans)',
      color: 'var(--cg-text)'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)',
      padding: '0 18px',
      height: 56,
      borderBottom: '1px solid var(--cg-border)',
      flexShrink: 0
    }
  }, onBack && /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    title: "\u623B\u308B",
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 30,
      height: 30,
      flexShrink: 0,
      cursor: 'pointer',
      background: 'transparent',
      border: '1px solid var(--cg-border)',
      borderRadius: 'var(--radius-md)',
      color: 'var(--cg-text-muted)',
      fontSize: 16,
      lineHeight: 1
    }
  }, "\u2190"), /*#__PURE__*/React.createElement("img", {
    src: "../assets/brand/logo-mark.svg",
    alt: "",
    style: {
      width: 30,
      height: 30,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 'var(--text-md)',
      whiteSpace: 'nowrap'
    }
  }, "Command ghostwriter")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 22,
      background: 'var(--cg-border)',
      margin: '0 4px'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      color: 'var(--cg-text-muted)',
      fontSize: 'var(--text-sm)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--cg-text)'
    }
  }, tpl ? tpl.id : '無題のドキュメント'), /*#__PURE__*/React.createElement(Badge, {
    tone: "success"
  }, tpl ? '保存済み' : '新規')), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), blocked && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 'var(--text-xs)',
      color: 'var(--cg-red-tint)',
      fontFamily: 'var(--font-mono)'
    }
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "terminal",
    size: 14,
    color: "var(--cg-red)"
  }), "1 error"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "sm",
    icon: /*#__PURE__*/React.createElement(window.Icon, {
      name: "settings",
      size: 15
    }),
    onClick: () => setSettings(true)
  }, "\u8A73\u7D30\u8A2D\u5B9A")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'grid',
      gridTemplateColumns: '1fr 7px 1fr',
      gridTemplateRows: 'minmax(0, 1fr)',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      minHeight: 0,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(PaneHeader, null, /*#__PURE__*/React.createElement(Segmented, {
    value: leftTab,
    onChange: setLeftTab,
    items: [{
      id: 'data',
      icon: /*#__PURE__*/React.createElement(window.Icon, {
        name: "config-file",
        size: 15
      }),
      label: 'データ定義'
    }, {
      id: 'tpl',
      icon: /*#__PURE__*/React.createElement(window.Icon, {
        name: "template-file",
        size: 15
      }),
      label: 'テンプレート'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), leftTab === 'data' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'var(--cg-text-faint)',
      whiteSpace: 'nowrap'
    }
  }, "\u5F62\u5F0F"), /*#__PURE__*/React.createElement(Segmented, {
    value: format,
    onChange: setFormat,
    items: FORMATS
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0
    }
  }, leftTab === 'data' ? /*#__PURE__*/React.createElement(CodeView, {
    code: dataText,
    lang: "toml",
    errorLine: dataErrLine,
    onChange: setDataText
  }) : /*#__PURE__*/React.createElement(CodeView, {
    code: tplText,
    lang: "jinja",
    errorLine: r.error && r.error.pane === 'tpl' ? r.error.line : 0,
    onChange: setTplText
  })), leftTab === 'data' && blocked && r.error && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
      padding: '11px 14px',
      borderTop: '1px solid var(--cg-error-border)',
      background: 'var(--cg-error-bg)'
    }
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "terminal",
    size: 16,
    color: "var(--cg-red)",
    style: {
      marginTop: 1,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      fontWeight: 700,
      color: 'var(--cg-red-tint)'
    }
  }, r.error.title, r.error.line ? ' · ' + r.error.line + '行目' : ''), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 12,
      color: 'var(--cg-text-muted)',
      marginTop: 3,
      lineHeight: 1.5
    }
  }, r.error.detail), r.suggest && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 9
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setFormat(r.suggest),
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-xs)',
      fontWeight: 600,
      color: '#fff',
      background: 'var(--cg-red)',
      border: 'none',
      borderRadius: 'var(--radius-sm)',
      padding: '5px 11px',
      cursor: 'pointer'
    }
  }, r.suggest.toUpperCase(), " \u3068\u3057\u3066\u8AAD\u307F\u8FBC\u3080"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setFormat(r.suggest),
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-xs)',
      color: 'var(--cg-text-muted)',
      background: 'transparent',
      border: '1px solid var(--cg-border-strong)',
      borderRadius: 'var(--radius-sm)',
      padding: '5px 11px',
      cursor: 'pointer'
    }
  }, "\u81EA\u52D5\u5224\u5B9A\u3067\u4FEE\u6B63")))), leftTab === 'tpl' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
      padding: '8px 14px',
      borderTop: '1px solid var(--cg-border)',
      background: 'var(--cg-bg-secondary)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'var(--cg-text-faint)',
      marginRight: 2
    }
  }, "\u691C\u51FA\u3057\u305F\u5909\u6570"), r.vars.length ? r.vars.map(v => /*#__PURE__*/React.createElement(Badge, {
    key: v,
    tone: r.error && r.error.varName === v ? 'error' : 'brand'
  }, v)) : /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'var(--cg-text-faint)'
    }
  }, "\u2014")), /*#__PURE__*/React.createElement(StatusBar, {
    tone: leftTab === 'data' && blocked ? 'err' : 'ok'
  }, leftTab === 'data' && blocked ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--cg-red)'
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--cg-red-tint)'
    }
  }, "\u89E3\u6790\u5931\u6557 \xB7 ", format.toUpperCase(), " \xB7 1 error")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "\u2713"), leftTab === 'data' ? /*#__PURE__*/React.createElement("span", null, "\u30D1\u30FC\u30B9\u6210\u529F \xB7 ", format.toUpperCase(), " \xB7 ", r.interfaces, " interfaces") : /*#__PURE__*/React.createElement("span", null, "\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u69CB\u6587OK \xB7 \u5909\u6570 ", r.vars.length, " \u4EF6")))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--cg-border)',
      cursor: 'col-resize',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 3,
      height: 28,
      borderRadius: 2,
      background: 'var(--cg-border-strong)'
    }
  })), /*#__PURE__*/React.createElement("section", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0,
      minHeight: 0,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(PaneHeader, null, /*#__PURE__*/React.createElement(Segmented, {
    value: rightMode,
    onChange: setRightMode,
    items: [{
      id: 'md',
      label: '手順書'
    }, {
      id: 'raw',
      label: 'Raw'
    }, {
      id: 'debug',
      label: 'Visual Debug'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), rightMode !== 'debug' && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Selectbox, {
    value: enc,
    options: ['UTF-8', 'Shift_JIS'],
    onChange: setEnc,
    style: {
      width: 152
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    disabled: blocked,
    icon: /*#__PURE__*/React.createElement(window.Icon, {
      name: "copy",
      size: 14
    }),
    onClick: () => fire('コピーしました')
  }, "\u30B3\u30D4\u30FC"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm",
    disabled: blocked,
    icon: /*#__PURE__*/React.createElement(window.Icon, {
      name: "download",
      size: 14
    }),
    onClick: () => fire('ダウンロードを開始')
  }, "\u4FDD\u5B58"))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minHeight: 0
    }
  }, blocked ? /*#__PURE__*/React.createElement(BlockedOutput, {
    format: format,
    error: r.error,
    suggest: r.suggest,
    onFix: () => r.suggest && setFormat(r.suggest)
  }) : /*#__PURE__*/React.createElement(React.Fragment, null, rightMode === 'raw' && /*#__PURE__*/React.createElement(CodeView, {
    code: r.output,
    lang: "markdown",
    readOnly: true
  }), rightMode === 'debug' && /*#__PURE__*/React.createElement(CodeView, {
    code: r.json,
    lang: "json",
    readOnly: true
  }), rightMode === 'md' && /*#__PURE__*/React.createElement(MarkdownView, {
    output: r.output
  }))), /*#__PURE__*/React.createElement(StatusBar, {
    tone: blocked ? 'err' : 'ok'
  }, blocked ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--cg-red)'
    }
  }, "\u2715"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--cg-red-tint)'
    }
  }, "\u5165\u529B\u30A8\u30E9\u30FC\u306E\u305F\u3081\u751F\u6210\u3067\u304D\u307E\u305B\u3093")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", null, "\u2713"), rightMode === 'raw' && /*#__PURE__*/React.createElement("span", null, "\u751F\u6210\u6210\u529F \xB7 ", r.output.replace(/\n+$/, '').split('\n').length, " \u884C \xB7 raw"), rightMode === 'md' && /*#__PURE__*/React.createElement("span", null, "\u624B\u9806\u66F8\u3092\u751F\u6210 \xB7 ", enc), rightMode === 'debug' && /*#__PURE__*/React.createElement("span", null, "\u89E3\u6790\u6210\u529F \xB7 ", r.keys, " keys \xB7 ", r.interfaces, " interfaces"))))), toast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      bottom: 26,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--cg-bg-secondary)',
      border: '1px solid var(--cg-success-border)',
      color: 'var(--cg-text)',
      borderRadius: 'var(--radius-pill)',
      padding: '9px 18px',
      fontSize: 'var(--text-sm)',
      boxShadow: 'var(--shadow-lg)',
      zIndex: 1100,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--cg-success)',
      fontWeight: 800
    }
  }, "\u2713"), toast), /*#__PURE__*/React.createElement(SettingsModal, {
    open: settings,
    onClose: () => setSettings(false)
  }));
}
function BlockedOutput({
  format,
  error,
  suggest,
  onFix
}) {
  const tplErr = error && error.pane === 'tpl';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      background: 'var(--cg-bg-code)',
      padding: 32,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "terminal",
    size: 40,
    color: "var(--cg-border-strong)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      fontWeight: 700,
      color: 'var(--cg-text)'
    }
  }, "\u51FA\u529B\u3092\u751F\u6210\u3067\u304D\u307E\u305B\u3093"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      color: 'var(--cg-text-muted)',
      maxWidth: 340,
      lineHeight: 1.6
    }
  }, tplErr ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--cg-red-tint)'
    }
  }, error.title), /*#__PURE__*/React.createElement("br", null), error.detail) : /*#__PURE__*/React.createElement(React.Fragment, null, "\u5165\u529B\u30C7\u30FC\u30BF\u3092 ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--cg-red-tint)'
    }
  }, format.toUpperCase()), " \u3068\u3057\u3066\u89E3\u6790\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u5DE6\u30DA\u30A4\u30F3\u306E\u30A8\u30E9\u30FC\u3092\u89E3\u6D88\u3059\u308B\u3068\u3001\u3053\u3053\u306B\u7D50\u679C\u304C\u8868\u793A\u3055\u308C\u307E\u3059\u3002")), suggest && /*#__PURE__*/React.createElement("button", {
    onClick: onFix,
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      fontWeight: 600,
      color: '#fff',
      background: 'var(--cg-red)',
      border: 'none',
      borderRadius: 'var(--radius-md)',
      padding: '8px 16px',
      cursor: 'pointer',
      marginTop: 4
    }
  }, suggest.toUpperCase(), " \u3068\u3057\u3066\u8AAD\u307F\u8FBC\u3080"));
}

// Tiny Markdown renderer — headings, fenced code, ordered/unordered lists, **bold**, `code`.
function renderInline(text, keyBase) {
  const nodes = [];
  const re = /\*\*(.+?)\*\*|`([^`]+?)`/g;
  let last = 0;
  let m;
  let i = 0;
  while (m = re.exec(text)) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] != null) nodes.push(/*#__PURE__*/React.createElement("b", {
      key: keyBase + '-' + i++,
      style: {
        color: 'var(--cg-text)'
      }
    }, m[1]));else nodes.push(/*#__PURE__*/React.createElement("code", {
      key: keyBase + '-' + i++,
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: '.92em',
        background: 'var(--cg-bg)',
        border: '1px solid var(--cg-border)',
        borderRadius: 4,
        padding: '1px 5px'
      }
    }, m[2]));
    last = re.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
function MarkdownView({
  output
}) {
  const lines = output.split('\n');
  const blocks = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line.trim())) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(/*#__PURE__*/React.createElement("pre", {
        key: key++,
        style: {
          fontFamily: 'var(--font-mono)',
          fontSize: 12.5,
          lineHeight: 1.5,
          background: 'var(--cg-bg)',
          border: '1px solid var(--cg-border)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 13px',
          margin: '0 0 14px',
          whiteSpace: 'pre',
          overflowX: 'auto',
          color: 'var(--cg-text)'
        }
      }, buf.join('\n')));
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      const sz = lvl === 1 ? 'var(--text-xl)' : lvl === 2 ? 'var(--text-lg)' : 'var(--text-base)';
      blocks.push(React.createElement('h' + lvl, {
        key: key++,
        style: {
          fontSize: sz,
          fontWeight: 700,
          margin: lvl === 1 ? '0 0 10px' : '18px 0 8px',
          color: 'var(--cg-text)'
        }
      }, renderInline(h[2], 'h' + key)));
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push(/*#__PURE__*/React.createElement("ul", {
        key: key++,
        style: {
          margin: '0 0 14px',
          paddingLeft: 22,
          color: 'var(--cg-text)',
          fontSize: 'var(--text-sm)',
          lineHeight: 1.7
        }
      }, items.map((it, j) => /*#__PURE__*/React.createElement("li", {
        key: j
      }, renderInline(it, 'u' + key + j)))));
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push(/*#__PURE__*/React.createElement("ol", {
        key: key++,
        style: {
          margin: '0 0 14px',
          paddingLeft: 22,
          color: 'var(--cg-text)',
          fontSize: 'var(--text-sm)',
          lineHeight: 1.7
        }
      }, items.map((it, j) => /*#__PURE__*/React.createElement("li", {
        key: j
      }, renderInline(it, 'o' + key + j)))));
      continue;
    }
    if (line.trim() === '') {
      i++;
      continue;
    }
    blocks.push(/*#__PURE__*/React.createElement("p", {
      key: key++,
      style: {
        margin: '0 0 12px',
        fontSize: 'var(--text-sm)',
        lineHeight: 1.7,
        color: 'var(--cg-text-muted)'
      }
    }, renderInline(line, 'p' + key)));
    i++;
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      overflow: 'auto',
      background: 'var(--cg-bg-code)',
      padding: '24px 28px',
      fontFamily: 'var(--font-sans)'
    }
  }, blocks.length ? blocks : /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--cg-text-faint)',
      fontSize: 'var(--text-sm)'
    }
  }, "\u2014"));
}
window.Editor = Editor;
})(); } catch (e) { __ds_ns.__errors.push({ path: "redesign/Editor.jsx", error: String((e && e.message) || e) }); }

// redesign/EmptyState.jsx
try { (() => {
/* global React */
// EmptyState — first-run onboarding for the 2-pane editor. Teaches the
// two-file concept (values + template → commands) and offers three ways to
// start: one-click sample, upload, or template library.
const {
  Button,
  FileUploader,
  Badge
} = window.CommandGhostwriterDesignSystem_0d5f31;

// Background spectres & drifting items for the haunting backdrop (no emoji — SVG + code).
// Background drifting items for the haunting backdrop (no emoji — SVG + code).
const CG_GLYPHS = [{
  name: 'server',
  top: '17%',
  left: '5%',
  size: 30,
  op: 0.08,
  anim: 'cg-drift',
  delay: '0s'
}, {
  name: 'router',
  top: '63%',
  left: '11%',
  size: 26,
  op: 0.07,
  anim: 'cg-sway',
  delay: '-4s'
}, {
  name: 'switch',
  top: '28%',
  left: '89%',
  size: 30,
  op: 0.08,
  anim: 'cg-drift2',
  delay: '-8s'
}, {
  name: 'topology',
  top: '70%',
  left: '83%',
  size: 36,
  op: 0.07,
  anim: 'cg-twirl',
  delay: '-2s'
}, {
  name: 'terminal',
  top: '46%',
  left: '3%',
  size: 24,
  op: 0.07,
  anim: 'cg-sway',
  delay: '-6s'
}, {
  name: 'ethernet-port',
  top: '80%',
  left: '46%',
  size: 24,
  op: 0.06,
  anim: 'cg-drift',
  delay: '-10s'
}];
const WHISPER_VOCAB = [
// drawn from common Linux /etc configs — sshd_config, nginx, sysctl, fstab, hosts, ntp, iptables, cron…
'PermitRootLogin no', 'Port 22', 'PasswordAuthentication no', 'AllowTcpForwarding no', 'nameserver 8.8.8.8', 'search corp.local', 'options timeout:2', 'listen 443 ssl;', 'proxy_pass http://backend;', 'server_name example.com;', 'worker_connections 1024;', 'net.ipv4.ip_forward = 1', 'vm.swappiness = 10', 'net.core.somaxconn = 1024', 'fs.file-max = 100000', '127.0.0.1   localhost', '::1   ip6-localhost', '192.168.1.10  router-001', 'iface eth0 inet static', 'address 192.168.1.10', 'netmask 255.255.255.0', 'gateway 192.168.1.1', 'server pool.ntp.org iburst', 'driftfile /var/lib/ntp/drift', '0 3 * * * /usr/bin/backup.sh', '*/5 * * * * root /usr/local/bin/check', '-A INPUT -p tcp --dport 22 -j ACCEPT', '-A INPUT -j DROP', '-P FORWARD DROP', 'UUID=… /boot ext4 defaults 0 1', 'tmpfs /tmp tmpfs defaults 0 0', '/dev/sda1 / ext4 errors=remount-ro', 'rocommunity public', 'syslocation datacenter-1', 'balance roundrobin', 'mode http', 'auth required pam_unix.so', 'ServerName www.example.com', 'DocumentRoot /var/www/html', 'interface GigabitEthernet0/1', '{% for intf in interfaces %}', '{{ global.hostname }}', '> _'];
// pseudo-random, seeded per index; a per-load time seed reshuffles the layout each reload
// while keeping it stable within one session (computed once at module load).
const CG_SEED = Date.now() % 100000 * 0.0173;
function rng(n) {
  const x = Math.sin((n + CG_SEED) * 99.13) * 43758.5453;
  return x - Math.floor(x);
}
const CG_WHISPERS = Array.from({
  length: 42
}, (_, i) => ({
  text: WHISPER_VOCAB[i % WHISPER_VOCAB.length],
  top: (4 + rng(i + 1) * 90).toFixed(1) + '%',
  left: (2 + rng(i + 51) * 90).toFixed(1) + '%',
  size: 11 + Math.round(rng(i + 17) * 2),
  delay: '-' + (rng(i + 7) * 9).toFixed(1) + 's'
}));
const CG_MOTES = Array.from({
  length: 90
}, (_, i) => ({
  left: (1 + rng(i + 200) * 97).toFixed(1) + '%',
  size: 2 + Math.round(rng(i + 311) * 2),
  dur: 12 + Math.round(rng(i + 421) * 12) + 's',
  delay: (rng(i + 533) * 14).toFixed(1) + 's',
  op: (0.3 + rng(i + 641) * 0.25).toFixed(2)
}));
function ConceptCard({
  icon,
  title,
  sub,
  note,
  outcome
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: 184,
      background: 'var(--cg-bg-secondary)',
      border: `1px solid ${outcome ? 'var(--cg-error-border)' : 'var(--cg-border)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '16px 16px 14px',
      boxShadow: outcome ? '0 0 0 1px var(--cg-error-border)' : 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 26,
      lineHeight: 1,
      marginBottom: 10
    }
  }, icon), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-base)',
      fontWeight: 700,
      color: 'var(--cg-text)'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--cg-text-muted)',
      marginTop: 3
    }
  }, sub), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: outcome ? 'error' : 'neutral'
  }, note)));
}
function Op({
  children,
  accent
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      placeItems: 'center',
      width: 34,
      flexShrink: 0,
      fontSize: 22,
      color: accent ? 'var(--cg-red)' : 'var(--cg-text-faint)',
      fontWeight: 700
    }
  }, children);
}
function EmptyState({
  onStart,
  onLibrary
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--cg-bg)',
      fontFamily: 'var(--font-sans)',
      color: 'var(--cg-text)',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)',
      padding: '0 18px',
      height: 56,
      borderBottom: '1px solid var(--cg-border)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../assets/brand/logo-mark.svg",
    alt: "",
    style: {
      width: 30,
      height: 30,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 'var(--text-md)',
      whiteSpace: 'nowrap'
    }
  }, "Command ghostwriter")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      color: 'var(--cg-text-muted)',
      textDecoration: 'none',
      fontSize: 'var(--text-sm)'
    }
  }, "\u4F7F\u3044\u65B9")), /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      top: 56,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(120% 90% at 50% 20%, transparent 26%, rgba(0,0,0,.80) 100%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(70% 50% at 50% -8%, rgba(90,120,150,.14), transparent 60%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "cg-glow",
    style: {
      position: 'absolute',
      top: '4%',
      left: '50%',
      width: 460,
      height: 460,
      marginLeft: -230,
      borderRadius: '50%',
      filter: 'blur(50px)',
      background: 'radial-gradient(circle, rgba(174,199,214,.5), rgba(174,199,214,0) 70%)'
    }
  }), CG_GLYPHS.map((g, i) => /*#__PURE__*/React.createElement("span", {
    key: 'g' + i,
    className: g.anim,
    style: {
      position: 'absolute',
      top: g.top,
      left: g.left,
      opacity: g.op,
      animationDelay: g.delay
    }
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: g.name,
    size: g.size,
    color: "var(--cg-ghost-outline)"
  }))), CG_WHISPERS.map((w, i) => /*#__PURE__*/React.createElement("span", {
    key: 'w' + i,
    className: "cg-fade",
    style: {
      position: 'absolute',
      top: w.top,
      left: w.left,
      opacity: 0.1,
      fontFamily: 'var(--font-mono)',
      fontSize: w.size,
      color: 'var(--cg-ghost-outline)',
      whiteSpace: 'nowrap',
      letterSpacing: '.05em',
      animationDelay: w.delay
    }
  }, w.text)), CG_MOTES.map((m, i) => /*#__PURE__*/React.createElement("span", {
    key: 'm' + i,
    className: "cg-ghost",
    style: {
      position: 'absolute',
      bottom: -10,
      left: m.left,
      width: m.size,
      height: m.size,
      borderRadius: '50%',
      background: 'var(--cg-ghost-outline)',
      opacity: 0,
      '--cg-d': m.dur,
      '--cg-delay': m.delay,
      '--cg-o': m.op
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "cg-mist",
    style: {
      position: 'absolute',
      bottom: -100,
      left: '50%',
      width: 1240,
      height: 320,
      marginLeft: -620,
      borderRadius: '50%',
      filter: 'blur(58px)',
      background: 'radial-gradient(circle, rgba(174,199,214,.32), rgba(174,199,214,0) 70%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "cg-creep",
    style: {
      position: 'absolute',
      bottom: 0,
      left: -120,
      right: -120,
      height: 180,
      filter: 'blur(34px)',
      background: 'linear-gradient(180deg, rgba(174,199,214,0), rgba(174,199,214,.18))'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "cg-mist",
    style: {
      position: 'absolute',
      top: '36%',
      left: '50%',
      width: 1040,
      height: 200,
      marginLeft: -520,
      borderRadius: '50%',
      filter: 'blur(50px)',
      animationDelay: '-3s',
      background: 'radial-gradient(circle, rgba(174,199,214,.18), rgba(174,199,214,0) 70%)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '40px 24px',
      position: 'relative',
      zIndex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      maxWidth: 880
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      marginBottom: 30
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: 76,
      height: 76,
      margin: '0 auto 18px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "cg-glow",
    style: {
      position: 'absolute',
      inset: -26,
      borderRadius: '50%',
      filter: 'blur(22px)',
      background: 'radial-gradient(circle, rgba(174,199,214,.6), rgba(174,199,214,0) 70%)'
    }
  }), /*#__PURE__*/React.createElement("img", {
    src: "../assets/brand/logo-mark.svg",
    alt: "",
    className: "cg-bob",
    style: {
      position: 'relative',
      width: 76,
      height: 76,
      filter: 'drop-shadow(0 4px 14px rgba(255,75,75,.35))'
    }
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '0 0 8px',
      fontSize: 'var(--text-2xl)',
      fontWeight: 700,
      letterSpacing: '-.01em'
    }
  }, "2\u3064\u306E\u30D5\u30A1\u30A4\u30EB\u304B\u3089\u3001\u5B9F\u884C\u53EF\u80FD\u306A\u30B3\u30DE\u30F3\u30C9\u3092\u3002"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '0 auto',
      maxWidth: 560,
      color: 'var(--cg-text-muted)',
      fontSize: 'var(--text-base)',
      lineHeight: 1.6
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--cg-text)'
    }
  }, "\u8A2D\u5B9A\u5B9A\u7FA9\u30D5\u30A1\u30A4\u30EB"), "\uFF08\u5024\uFF09\u3068", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--cg-text)'
    }
  }, " Jinja\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8"), "\uFF08\u96DB\u5F62\uFF09\u3092\u7D44\u307F\u5408\u308F\u305B\u308B\u3060\u3051\u3002 \u7E70\u308A\u8FD4\u3057\u306ECLI\u4F5C\u696D\u3092\u3001\u5024\u306E\u5DEE\u3057\u66FF\u3048\u3060\u3051\u3067\u751F\u6210\u3067\u304D\u307E\u3059\u3002"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      margin: '18px auto 10px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 1,
      background: 'linear-gradient(90deg, transparent, var(--cg-border-strong))'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 13,
      color: 'var(--cg-red)',
      fontWeight: 600
    }
  }, ">_"), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 1,
      background: 'linear-gradient(90deg, var(--cg-border-strong), transparent)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "cg-flicker",
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-sm)',
      letterSpacing: '.18em',
      color: 'var(--cg-ghost-outline)'
    }
  }, "\u8A2D\u5B9A\u5B9A\u7FA9 \xD7 \u30C6\u30F3\u30D7\u30EC\u30FC\u30C8 \u2192 \u518D\u73FE\u53EF\u80FD\u306A\u30B3\u30DE\u30F3\u30C9")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      marginBottom: 34,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(ConceptCard, {
    icon: /*#__PURE__*/React.createElement(window.Icon, {
      name: "config-file",
      size: 26
    }),
    title: "\u8A2D\u5B9A\u5B9A\u7FA9\u30D5\u30A1\u30A4\u30EB",
    sub: "TOML \xB7 YAML \xB7 CSV",
    note: "\u300C\u5024\u300D\u3092\u5B9A\u7FA9"
  }), /*#__PURE__*/React.createElement(Op, null, "\uFF0B"), /*#__PURE__*/React.createElement(ConceptCard, {
    icon: /*#__PURE__*/React.createElement(window.Icon, {
      name: "template-file",
      size: 26
    }),
    title: "Jinja\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8",
    sub: ".j2 \xB7 .jinja2",
    note: "\u300C\u96DB\u5F62\u300D\u3092\u8A18\u8FF0"
  }), /*#__PURE__*/React.createElement(Op, {
    accent: true
  }, "\u2192"), /*#__PURE__*/React.createElement(ConceptCard, {
    icon: /*#__PURE__*/React.createElement(window.Icon, {
      name: "terminal",
      size: 26,
      color: "var(--cg-red)"
    }),
    title: "\u5B9F\u884C\u53EF\u80FD\u306A\u30B3\u30DE\u30F3\u30C9",
    sub: "CLI \xB7 Markdown",
    note: "\u305D\u306E\u307E\u307E\u5B9F\u884C",
    outcome: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--cg-bg-secondary)',
      border: '1px solid var(--cg-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-base)',
      fontWeight: 700
    }
  }, "\u306F\u3058\u3081\u3066\u306A\u3089\u3001\u30B5\u30F3\u30D7\u30EB\u3067\u8A66\u3059"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--cg-text-muted)',
      marginTop: 2
    }
  }, "Cisco\u30B9\u30A4\u30C3\u30C1\u8A2D\u5B9A\u306E\u4F8B\u3092\u8AAD\u307F\u8FBC\u307F\u3001\u3059\u3050\u306B\u7D50\u679C\u307E\u3067\u4F53\u9A13\u3067\u304D\u307E\u3059\uFF0830\u79D2\uFF09\u3002")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg",
    icon: /*#__PURE__*/React.createElement(window.Icon, {
      name: "generate",
      size: 17
    }),
    onClick: () => onStart('sample')
  }, "\u30B5\u30F3\u30D7\u30EB\u3067\u8A66\u3059")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      margin: '20px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 1,
      background: 'var(--cg-border)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'var(--cg-text-faint)'
    }
  }, "\u307E\u305F\u306F\u3001\u81EA\u5206\u306E\u30D5\u30A1\u30A4\u30EB\u304B\u3089"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 1,
      background: 'var(--cg-border)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(FileUploader, {
    label: "\u2460 \u8A2D\u5B9A\u5B9A\u7FA9\u30D5\u30A1\u30A4\u30EB",
    accept: "TOML, YAML, CSV",
    onBrowse: () => onStart('upload')
  }), /*#__PURE__*/React.createElement(FileUploader, {
    label: "\u2461 Jinja\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8",
    accept: "J2, JINJA2",
    onBrowse: () => onStart('upload')
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      onLibrary && onLibrary();
    },
    style: {
      color: 'var(--cg-info)',
      textDecoration: 'none',
      fontSize: 'var(--text-sm)',
      fontWeight: 600
    }
  }, "\u4FDD\u5B58\u6E08\u307F\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u30E9\u30A4\u30D6\u30E9\u30EA\u304B\u3089\u9078\u3076 \u2192"))))));
}
window.EmptyState = EmptyState;
})(); } catch (e) { __ds_ns.__errors.push({ path: "redesign/EmptyState.jsx", error: String((e && e.message) || e) }); }

// redesign/Icon.jsx
try { (() => {
/* global React */
// Icon — inlines a brand SVG icon from assets/icons so it inherits `color`
// (the SVGs use stroke="currentColor"). Use for infra + UI glyphs.
function Icon({
  name,
  size = 18,
  color,
  style
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    let alive = true;
    fetch('../assets/icons/' + name + '.svg').then(r => r.text()).then(t => {
      if (!alive || !ref.current) return;
      ref.current.innerHTML = t;
      const svg = ref.current.querySelector('svg');
      if (svg) {
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
      }
    }).catch(() => {});
    return () => {
      alive = false;
    };
  }, [name, size]);
  return /*#__PURE__*/React.createElement("span", {
    ref: ref,
    "aria-hidden": "true",
    style: {
      display: 'inline-grid',
      placeItems: 'center',
      width: size,
      height: size,
      color,
      ...style
    }
  });
}
window.Icon = Icon;
})(); } catch (e) { __ds_ns.__errors.push({ path: "redesign/Icon.jsx", error: String((e && e.message) || e) }); }

// redesign/Library.jsx
try { (() => {
/* global React */
// Library — template gallery. Left category rail + right card grid + 空から作成.
// Picking a card calls onOpen(template); 空から作成 calls onOpen(null).
const {
  Badge
} = window.CommandGhostwriterDesignSystem_0d5f31;
const CATS = [{
  id: 'all',
  label: 'すべて',
  icon: 'topology'
}, {
  id: 'network',
  label: 'ネットワーク機器',
  icon: 'router'
}, {
  id: 'server',
  label: 'サーバ / Linux',
  icon: 'server'
}, {
  id: 'dns',
  label: 'DNS',
  icon: 'ethernet-port'
}, {
  id: 'runbook',
  label: '手順書',
  icon: 'config-file'
}];
const FMT_TONE = {
  toml: 'brand',
  yaml: 'info',
  csv: 'warning'
};
const OUT_LABEL = {
  cli: 'CLI',
  config: 'config',
  markdown: 'Markdown'
};
function CatIcon({
  name,
  size,
  color
}) {
  return /*#__PURE__*/React.createElement(window.Icon, {
    name: name,
    size: size,
    color: color
  });
}
function TemplateCard({
  tpl,
  onOpen
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen(tpl),
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      textAlign: 'left',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--cg-bg-secondary)',
      border: `1px solid ${hover ? 'var(--cg-red)' : 'var(--cg-border)'}`,
      borderRadius: 'var(--radius-md)',
      padding: 16,
      gap: 10,
      minHeight: 158,
      transition: 'border-color var(--dur-base), transform var(--dur-base)',
      transform: hover ? 'translateY(-2px)' : 'none',
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 'var(--radius-sm)',
      background: 'var(--cg-bg)',
      border: '1px solid var(--cg-border)',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(CatIcon, {
    name: CATS.find(c => c.id === tpl.category).icon,
    size: 18,
    color: "var(--cg-red)"
  })), tpl.live && /*#__PURE__*/React.createElement(Badge, {
    tone: "success"
  }, "\u30E9\u30A4\u30D6")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-base)',
      fontWeight: 700,
      color: 'var(--cg-text)',
      lineHeight: 1.35
    }
  }, tpl.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'var(--cg-text-muted)',
      lineHeight: 1.55,
      flex: 1
    }
  }, tpl.desc), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: FMT_TONE[tpl.format]
  }, tpl.format.toUpperCase()), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: 'var(--cg-text-faint)'
    }
  }, "\u2192"), /*#__PURE__*/React.createElement(Badge, null, OUT_LABEL[tpl.output]), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: 'var(--cg-text-faint)',
      fontFamily: 'var(--font-mono)'
    }
  }, tpl.updated)));
}
function Library({
  onOpen,
  onClose
}) {
  const [cat, setCat] = React.useState('all');
  const all = window.CGTemplates || [];
  const list = cat === 'all' ? all : all.filter(t => t.category === cat);
  const count = id => id === 'all' ? all.length : all.filter(t => t.category === id).length;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--cg-bg)',
      fontFamily: 'var(--font-sans)',
      color: 'var(--cg-text)'
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-4)',
      padding: '0 18px',
      height: 56,
      borderBottom: '1px solid var(--cg-border)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../assets/brand/logo-mark.svg",
    alt: "",
    style: {
      width: 30,
      height: 30,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: 'var(--text-md)',
      whiteSpace: 'nowrap'
    }
  }, "Command ghostwriter"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 22,
      background: 'var(--cg-border)',
      margin: '0 4px'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--cg-text-muted)'
    }
  }, "\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u30E9\u30A4\u30D6\u30E9\u30EA"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      cursor: 'pointer',
      background: 'transparent',
      border: '1px solid var(--cg-border)',
      borderRadius: 'var(--radius-md)',
      color: 'var(--cg-text-muted)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      padding: '6px 12px'
    }
  }, "\u2190 \u623B\u308B")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("nav", {
    style: {
      width: 220,
      flexShrink: 0,
      borderRight: '1px solid var(--cg-border)',
      background: 'var(--cg-bg-secondary)',
      padding: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-2xs)',
      textTransform: 'uppercase',
      letterSpacing: '.06em',
      color: 'var(--cg-text-faint)',
      fontWeight: 700,
      padding: '4px 8px 10px'
    }
  }, "\u30AB\u30C6\u30B4\u30EA"), CATS.map(c => {
    const on = c.id === cat;
    return /*#__PURE__*/React.createElement("button", {
      key: c.id,
      onClick: () => setCat(c.id),
      style: {
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        background: on ? 'rgba(255,75,75,.1)' : 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-sm)',
        padding: '8px 9px',
        marginBottom: 2,
        color: on ? 'var(--cg-red-tint)' : 'var(--cg-text)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)',
        fontWeight: on ? 600 : 400,
        textAlign: 'left'
      }
    }, /*#__PURE__*/React.createElement(CatIcon, {
      name: c.icon,
      size: 16,
      color: on ? 'var(--cg-red)' : 'var(--cg-text-muted)'
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, c.label), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        color: 'var(--cg-text-faint)',
        fontFamily: 'var(--font-mono)'
      }
    }, count(c.id)));
  })), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minWidth: 0,
      overflow: 'auto',
      padding: 'var(--space-8)'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 'var(--text-xl)',
      fontWeight: 700,
      margin: '0 0 4px'
    }
  }, "\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u304B\u3089\u59CB\u3081\u308B"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--cg-text-muted)',
      margin: '0 0 22px'
    }
  }, "\u5B9A\u578B\u4F5C\u696D\u306E\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u3092\u9078\u3076\u3068\u3001\u30C7\u30FC\u30BF\u5B9A\u7FA9\u3068\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u3092\u8AAD\u307F\u8FBC\u3093\u3060\u72B6\u614B\u3067\u30A8\u30C7\u30A3\u30BF\u304C\u958B\u304D\u307E\u3059\u3002"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(244px, 1fr))',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onOpen(null),
    style: {
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      minHeight: 158,
      background: 'transparent',
      border: '1px dashed var(--cg-border-strong)',
      borderRadius: 'var(--radius-md)',
      color: 'var(--cg-text-muted)',
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "generate",
    size: 26,
    color: "var(--cg-text-muted)"
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      fontWeight: 600
    }
  }, "\u7A7A\u304B\u3089\u4F5C\u6210"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-xs)',
      color: 'var(--cg-text-faint)'
    }
  }, "\u30B5\u30F3\u30D7\u30EB\u304B\u3089\u66F8\u304D\u59CB\u3081\u308B")), list.map(t => /*#__PURE__*/React.createElement(TemplateCard, {
    key: t.id,
    tpl: t,
    onOpen: onOpen
  }))))));
}
window.Library = Library;
})(); } catch (e) { __ds_ns.__errors.push({ path: "redesign/Library.jsx", error: String((e && e.message) || e) }); }

// redesign/SettingsModal.jsx
try { (() => {
/* global React */
// SettingsModal — the 詳細設定 panel, moved off the main canvas into an overlay
// dialog (replaces the old standalone tab). Composes DS form controls.
const {
  Toggle,
  TextInput,
  Selectbox,
  RadioGroup,
  Button,
  Divider
} = window.CommandGhostwriterDesignSystem_0d5f31;
const FMT_OPTIONS = ['3: 半角スペースと余分な改行を一部削除', '0: フォーマット指定無し', '1: 半角スペースを一部削除', '2: 余分な改行を一部削除', '4: 半角スペースの一部と余分な改行を全て削除'];
function Field({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, children);
}
function Sub({
  children
}) {
  return /*#__PURE__*/React.createElement("h4", {
    style: {
      margin: '0 0 2px',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      fontWeight: 700,
      color: 'var(--cg-text)'
    }
  }, children);
}
function SettingsModal({
  open,
  onClose
}) {
  const [nan, setNan] = React.useState(true);
  const [nanWith, setNanWith] = React.useState('#');
  const [strict, setStrict] = React.useState(true);
  const [auto, setAuto] = React.useState(true);
  const [rows, setRows] = React.useState('csv_rows');
  const [fmt, setFmt] = React.useState(FMT_OPTIONS[0]);
  const [enc, setEnc] = React.useState('UTF-8');
  const [fname, setFname] = React.useState('command');
  const [ts, setTs] = React.useState(true);
  const [ext, setExt] = React.useState('txt');
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 1000,
      background: 'rgba(0,0,0,.55)',
      backdropFilter: 'blur(2px)',
      display: 'grid',
      placeItems: 'center',
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: 620,
      maxHeight: '86vh',
      overflow: 'auto',
      background: 'var(--cg-bg)',
      border: '1px solid var(--cg-border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)',
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      borderBottom: '1px solid var(--cg-border)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 'var(--text-lg)',
      fontWeight: 700,
      color: 'var(--cg-text)',
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement(window.Icon, {
    name: "settings",
    size: 18
  }), "\u8A73\u7D30\u8A2D\u5B9A"), /*#__PURE__*/React.createElement("span", {
    onClick: onClose,
    style: {
      cursor: 'pointer',
      color: 'var(--cg-text-muted)',
      fontSize: 22,
      lineHeight: 1
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--space-6)',
      padding: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement(Sub, null, "\u5165\u529B\u30D5\u30A1\u30A4\u30EB"), /*#__PURE__*/React.createElement(Field, null, /*#__PURE__*/React.createElement(TextInput, {
    label: "CSV\u306Efor\u30EB\u30FC\u30D7\u5BFE\u8C61\u306E\u5909\u6570\u540D",
    value: rows,
    onChange: setRows
  })), /*#__PURE__*/React.createElement(Field, null, /*#__PURE__*/React.createElement(Toggle, {
    checked: nan,
    label: "CSV\u306E\u6B20\u640D\u5024(NaN)\u3092\u6307\u5B9A\u6587\u5B57\u3068\u3057\u3066\u6271\u3046",
    onChange: setNan
  }), /*#__PURE__*/React.createElement(TextInput, {
    label: "\u6B20\u640D\u5024(NaN)\u306E\u5909\u63DB\u5F8C\u306E\u6587\u5B57",
    value: nanWith,
    onChange: setNanWith
  })), /*#__PURE__*/React.createElement(Field, null, /*#__PURE__*/React.createElement(Toggle, {
    checked: strict,
    label: "\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u306E\u5909\u6570\u30C1\u30A7\u30C3\u30AF\u53B3\u683C\u5316",
    onChange: setStrict
  })), /*#__PURE__*/React.createElement(Field, null, /*#__PURE__*/React.createElement(Toggle, {
    checked: auto,
    label: "UTF-8\u4EE5\u5916\u306E\u6587\u5B57\u30B3\u30FC\u30C9\u3092\u81EA\u52D5\u5224\u5B9A",
    onChange: setAuto
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement(Sub, null, "\u51FA\u529B\u30D5\u30A1\u30A4\u30EB"), /*#__PURE__*/React.createElement(Field, null, /*#__PURE__*/React.createElement(Selectbox, {
    label: "\u51FA\u529B\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8",
    value: fmt,
    options: FMT_OPTIONS,
    onChange: setFmt
  })), /*#__PURE__*/React.createElement(Field, null, /*#__PURE__*/React.createElement(Selectbox, {
    label: "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u306E\u6587\u5B57\u30B3\u30FC\u30C9",
    value: enc,
    options: ['UTF-8', 'Shift_JIS'],
    onChange: setEnc
  })), /*#__PURE__*/React.createElement(Field, null, /*#__PURE__*/React.createElement(TextInput, {
    label: "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u6642\u306E\u30D5\u30A1\u30A4\u30EB\u540D",
    value: fname,
    onChange: setFname
  })), /*#__PURE__*/React.createElement(Field, null, /*#__PURE__*/React.createElement(Toggle, {
    checked: ts,
    label: "\u30D5\u30A1\u30A4\u30EB\u540D\u306B\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u3092\u4ED8\u4E0E",
    onChange: setTs
  })), /*#__PURE__*/React.createElement(Field, null, /*#__PURE__*/React.createElement(RadioGroup, {
    label: "\u30D5\u30A1\u30A4\u30EB\u62E1\u5F35\u5B50",
    value: ext,
    options: ['txt', 'md'],
    horizontal: true,
    onChange: setExt
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 'var(--space-3)',
      padding: '14px 20px',
      borderTop: '1px solid var(--cg-border)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    onClick: onClose
  }, "\u9589\u3058\u308B"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    onClick: onClose
  }, "\u9069\u7528"))));
}
window.SettingsModal = SettingsModal;
})(); } catch (e) { __ds_ns.__errors.push({ path: "redesign/SettingsModal.jsx", error: String((e && e.message) || e) }); }

// redesign/data.js
try { (() => {
/* global window */
// Sample content for the redesigned 2-pane editor (illustrative, grounded in
// the repo's assets/examples). Attached to window for the babel scripts.

window.CG = {
  configToml: `[global]
hostname = "SAMPLE-ROUTER-001"
vlans = [10, 20, 30, 99]

[global.password]
enable = "P@ssw0rd"

[interfaces."GigabitEthernet0/1"]
mode = "access"
access_vlan = 10
description = "admin office"
cdp_enable = false

[interfaces."GigabitEthernet0/19"]
mode = "trunk"
native_vlan = 99
description = "access point #2"
cdp_enable = true

[interfaces."GigabitEthernet0/24"]
mode = "trunk"
description = "uplink #1"
cdp_enable = true`,
  templateJ2: `# スイッチポート設定手順 — {{ global.hostname }}

対象スイッチ **{{ global.hostname }}** に VLAN {{ global.vlans | join(', ') }} を構成し、各ポートを設定します。作業は現地またはコンソール接続で実施してください。

## 1. 設定モードへ入る

特権 EXEC モードから設定モードへ移行します。

\`\`\`bash
enable
configure terminal
hostname {{ global.hostname }}
\`\`\`

## 2. VLAN を作成する

利用する VLAN をまとめて定義します。

\`\`\`bash
vlan {{ global.vlans | join(',') }}
\`\`\`

## 3. 各インターフェースを設定する
{% for name, intf in interfaces.items() %}
**{{ name }}** — {{ intf.description }}

\`\`\`bash
interface {{ name }}
 description {{ intf.description }}
{% if intf.mode == "access" %}
 switchport mode access
 switchport access vlan {{ intf.access_vlan }}
{% else %}
 switchport mode trunk
{% endif %}
\`\`\`
{% endfor %}
## 4. 設定を保存する

動作を確認し、問題なければ起動コンフィグへ保存します。

\`\`\`bash
end
write memory
\`\`\``,
  generatedCli: `hostname SAMPLE-ROUTER-001
vlan 10,20,30,99
!
interface GigabitEthernet0/1
 description admin office
 switchport mode access
 switchport access vlan 10
!
interface GigabitEthernet0/19
 description access point #2
 switchport mode trunk
!
interface GigabitEthernet0/24
 description uplink #1
 switchport mode trunk
!
end`,
  debugJson: `{
  "global": {
    "hostname": "SAMPLE-ROUTER-001",
    "vlans": [10, 20, 30, 99],
    "password": { "enable": "P@ssw0rd" }
  },
  "interfaces": {
    "GigabitEthernet0/1": {
      "mode": "access",
      "access_vlan": 10,
      "description": "admin office",
      "cdp_enable": false
    },
    "GigabitEthernet0/24": {
      "mode": "trunk",
      "description": "uplink #1",
      "cdp_enable": true
    }
  }
}`,
  // Variables auto-detected from the template
  vars: ['global.hostname', 'global.vlans', 'interfaces', 'intf.description', 'intf.mode', 'intf.access_vlan']
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "redesign/data.js", error: String((e && e.message) || e) }); }

// redesign/engine.js
try { (() => {
/* global window */
// Lightweight live engine for the redesigned editor. NOT a full TOML/Jinja
// implementation — just enough to make the 2-pane editor recompute output,
// variables, and validation from real input. Attached to window.CGEngine.

(function () {
  // ---- minimal TOML parser (tables, dotted/quoted keys, str/num/bool/array) ----
  function parseToml(src) {
    const root = {};
    let cur = root;
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const line = stripComment(raw).trim();
      if (!line) continue;

      // array-of-tables [[a.b]] — must be tested before the single [table] header
      const ath = line.match(/^\[\[(.+)\]\]$/);
      if (ath) {
        const path = splitKeys(ath[1]);
        const key = path[path.length - 1];
        const parent = path.slice(0, -1).reduce((o, k) => o[k] = o[k] || {}, root);
        if (!Array.isArray(parent[key])) parent[key] = [];
        const tbl = {};
        parent[key].push(tbl);
        cur = tbl;
        continue;
      }
      // table header [a.b."c"]
      const th = line.match(/^\[(.+)\]$/);
      if (th) {
        const path = splitKeys(th[1]);
        cur = path.reduce((o, k) => o[k] = o[k] || {}, root);
        continue;
      }
      // key = value
      const kv = line.match(/^(.+?)=(.*)$/);
      if (!kv) {
        const e = new Error('構文を解釈できません');
        e.line = i + 1;
        e.detail = '「key = value」または「[table]」の形式が必要です';
        throw e;
      }
      const keyPath = splitKeys(kv[1].trim());
      let val;
      try {
        val = parseValue(kv[2].trim());
      } catch (err) {
        err.line = i + 1;
        throw err;
      }
      const parent = keyPath.slice(0, -1).reduce((o, k) => o[k] = o[k] || {}, cur);
      parent[keyPath[keyPath.length - 1]] = val;
    }
    return root;
  }
  function stripComment(line) {
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i - 1] !== '\\') q = !q;else if (ch === '#' && !q) return line.slice(0, i);
    }
    return line;
  }
  function splitKeys(s) {
    const out = [];
    let buf = '';
    let q = false;
    for (const ch of s) {
      if (ch === '"') {
        q = !q;
        continue;
      }
      if (ch === '.' && !q) {
        out.push(buf.trim());
        buf = '';
        continue;
      }
      buf += ch;
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  }
  function parseValue(v) {
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (/^".*"$/.test(v)) return v.slice(1, -1);
    if (/^-?\d+$/.test(v)) return parseInt(v, 10);
    if (/^-?\d*\.\d+$/.test(v)) return parseFloat(v);
    if (/^\[.*\]$/.test(v)) {
      const inner = v.slice(1, -1).trim();
      if (!inner) return [];
      return splitTop(inner).map(x => parseValue(x.trim()));
    }
    const e = new Error('値を解釈できません: ' + v);
    e.detail = '文字列は "..."、数値・真偽値・配列 [..] が使えます';
    throw e;
  }
  function splitTop(s) {
    const out = [];
    let buf = '';
    let depth = 0;
    let q = false;
    for (const ch of s) {
      if (ch === '"') q = !q;
      if (!q && ch === '[') depth++;
      if (!q && ch === ']') depth--;
      if (ch === ',' && depth === 0 && !q) {
        out.push(buf);
        buf = '';
        continue;
      }
      buf += ch;
    }
    if (buf.trim()) out.push(buf);
    return out;
  }

  // ---- extract {{ vars }} and {% for x in y %} from a Jinja template ----
  function extractVars(tpl) {
    const vars = new Set();
    const loopVars = new Set();
    let m;
    const reFor = /\{%\s*for\s+([\w,\s]+)\s+in\s+([\w.]+?)(?:\.(?:items|values|keys)\(\))?\s*%\}/g;
    while (m = reFor.exec(tpl)) {
      m[1].split(',').forEach(v => loopVars.add(v.trim()));
      vars.add(m[2].trim());
    }
    const reExpr = /\{\{\s*([\w.]+)/g;
    while (m = reExpr.exec(tpl)) {
      const base = m[1].split('.')[0];
      if (!loopVars.has(base)) vars.add(m[1].trim());
    }
    return [...vars];
  }

  // ---- tiny Jinja-ish renderer: {{ x }}, | join(','), {% for k,v in obj %}, {% if %} ----
  function render(tpl, ctx) {
    // strip comments
    tpl = tpl.replace(/\{#[\s\S]*?#\}/g, '');
    // Jinja whitespace control, ON by default here so block-style loops don't
    // leave a blank line per iteration:
    //  - lstrip_blocks: drop leading spaces/tabs before a block tag on its own line
    //  - trim_blocks:   drop the single newline right after a block tag
    tpl = tpl.replace(/^[ \t]+(\{%)/gm, '$1');
    tpl = tpl.replace(/(\{%[^%]*%\})\n/g, '$1');
    return renderBlock(tpl, ctx);
  }
  function lookup(path, ctx) {
    return path.split('.').reduce((o, k) => o == null ? undefined : o[k], ctx);
  }
  function applyFilters(val, filters) {
    for (const f of filters) {
      const jm = f.match(/^join\(\s*'(.*)'\s*\)$/) || f.match(/^join\(\s*"(.*)"\s*\)$/);
      if (jm && Array.isArray(val)) val = val.join(jm[1]);else if (f === 'upper' && typeof val === 'string') val = val.toUpperCase();else if (f === 'lower' && typeof val === 'string') val = val.toLowerCase();
    }
    return val;
  }
  function evalExpr(expr, ctx) {
    const parts = expr.split('|').map(s => s.trim());
    let val = lookup(parts[0], ctx);
    if (val === undefined) {
      const e = new Error('未定義の変数: ' + parts[0]);
      e.detail = 'テンプレートの変数が設定データに見つかりません';
      e.varName = parts[0];
      throw e;
    }
    return applyFilters(val, parts.slice(1));
  }
  function renderBlock(tpl, ctx) {
    let out = '';
    let i = 0;
    const tagRe = /\{\{(.+?)\}\}|\{%(.+?)%\}/g;
    let m;
    let last = 0;
    const stack = [];
    // We process sequentially, handling for/if/endfor/endif by finding matching blocks.
    // Simplify: use a recursive scan.
    return scan(tpl, ctx);
  }
  function findMatch(tpl, from, openKw, closeKw) {
    const re = /\{%\s*(\w+)/g;
    re.lastIndex = from;
    let depth = 0;
    let m;
    while (m = re.exec(tpl)) {
      if (m[1] === openKw) depth++;else if (m[1] === closeKw) {
        if (depth === 0) return m.index;
        depth--;
      }
    }
    return -1;
  }
  function scan(tpl, ctx) {
    let out = '';
    let i = 0;
    const re = /\{\{(.+?)\}\}|\{%(.+?)%\}/g;
    let m;
    let last = 0;
    while (m = re.exec(tpl)) {
      out += tpl.slice(last, m.index);
      if (m[1] != null) {
        out += String(evalExpr(m[1].trim(), ctx));
        last = re.lastIndex;
      } else {
        const tag = m[2].trim();
        const forM = tag.match(/^for\s+([\w,\s]+)\s+in\s+([\w.]+?)(?:\.(?:items|values|keys)\(\))?$/);
        const ifM = tag.match(/^if\s+(.+)$/);
        if (forM) {
          const endIdx = findMatch(tpl, re.lastIndex, 'for', 'endfor');
          const body = tpl.slice(re.lastIndex, endIdx);
          const coll = lookup(forM[2].trim(), ctx);
          const names = forM[1].split(',').map(s => s.trim());
          let acc = '';
          if (coll && typeof coll === 'object') {
            const entries = Array.isArray(coll) ? coll.map((v, k) => [k, v]) : Object.entries(coll);
            let li = 0;
            for (const [k, v] of entries) {
              li++;
              const sub = Object.assign({}, ctx);
              if (names.length === 2) {
                sub[names[0]] = k;
                sub[names[1]] = v;
              } else {
                sub[names[0]] = v;
              }
              sub.loop_index = li;
              acc += scan(body, sub);
            }
          }
          out += acc;
          re.lastIndex = skipTag(tpl, endIdx);
          last = re.lastIndex;
        } else if (ifM) {
          const endIdx = findMatch(tpl, re.lastIndex, 'if', 'endif');
          const body = tpl.slice(re.lastIndex, endIdx);
          // optional {% else %}
          const elseIdx = findElse(tpl, re.lastIndex, endIdx);
          const cond = evalCond(ifM[1], ctx);
          if (elseIdx >= 0) {
            out += cond ? scan(tpl.slice(re.lastIndex, elseIdx), ctx) : scan(tpl.slice(skipTag(tpl, elseIdx), endIdx), ctx);
          } else {
            out += cond ? scan(body, ctx) : '';
          }
          re.lastIndex = skipTag(tpl, endIdx);
          last = re.lastIndex;
        } else {
          // unknown tag (endfor/endif handled by skips) — drop it
          last = re.lastIndex;
        }
      }
    }
    out += tpl.slice(last);
    return out;
  }
  function findElse(tpl, from, end) {
    const re = /\{%\s*(\w+)/g;
    re.lastIndex = from;
    let depth = 0;
    let m;
    while ((m = re.exec(tpl)) && m.index < end) {
      if (m[1] === 'if' || m[1] === 'for') depth++;else if (m[1] === 'endif' || m[1] === 'endfor') depth--;else if (m[1] === 'else' && depth === 0) return m.index;
    }
    return -1;
  }
  function skipTag(tpl, idx) {
    const close = tpl.indexOf('%}', idx);
    return close === -1 ? tpl.length : close + 2;
  }
  function evalCond(expr, ctx) {
    const cmp = expr.match(/^(.+?)(==|!=)(.+)$/);
    if (cmp) {
      const a = lookup(cmp[1].trim(), ctx);
      let b = cmp[3].trim();
      if (/^".*"$/.test(b) || /^'.*'$/.test(b)) b = b.slice(1, -1);else if (b === 'true') b = true;else if (b === 'false') b = false;else if (/^-?\d+$/.test(b)) b = parseInt(b, 10);
      return cmp[2] === '==' ? a === b : a !== b;
    }
    const v = lookup(expr.trim(), ctx);
    return !!v;
  }

  // trim_blocks handles loop-induced blanks; here we only cap runs of blank
  // lines at one (3+ newlines → 2) so intentional spacing survives.
  function tidy(s) {
    return s.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+$/gm, '').trimEnd() + '\n';
  }

  // ---- minimal YAML parser (indentation maps, block lists, inline scalars) ----
  function stripYamlComment(line) {
    let q = null;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === q) q = null;
        continue;
      }
      if (ch === '"' || ch === "'") q = ch;else if (ch === '#' && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
    }
    return line;
  }
  function yamlScalar(v) {
    if (v === '' || v === '~' || v === 'null') return null;
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (/^".*"$/.test(v) || /^'.*'$/.test(v)) return v.slice(1, -1);
    if (/^-?\d+$/.test(v)) return parseInt(v, 10);
    if (/^-?\d*\.\d+$/.test(v)) return parseFloat(v);
    if (/^\[.*\]$/.test(v)) {
      const inner = v.slice(1, -1).trim();
      return inner ? splitTop(inner).map(x => yamlScalar(x.trim())) : [];
    }
    return v;
  }
  function parseYaml(src) {
    const rows = [];
    src.split('\n').forEach((raw, i) => {
      const s = stripYamlComment(raw);
      if (s.trim() === '') return;
      rows.push({
        indent: s.match(/^ */)[0].length,
        text: s.trim(),
        n: i + 1
      });
    });
    let pos = 0;
    function parseNode(indent) {
      if (pos >= rows.length) return null;
      return rows[pos].text.startsWith('- ') ? parseList(indent) : parseMap(indent);
    }
    function parseMap(indent) {
      const obj = {};
      while (pos < rows.length && rows[pos].indent === indent && !rows[pos].text.startsWith('- ')) {
        const row = rows[pos];
        const m = row.text.match(/^([^:]+):\s*(.*)$/);
        if (!m) {
          const e = new Error('マッピングを解釈できません');
          e.line = row.n;
          e.detail = '「key: value」の形式が必要です';
          throw e;
        }
        const key = m[1].trim();
        const val = m[2].trim();
        pos++;
        if (val === '') {
          obj[key] = pos < rows.length && rows[pos].indent > indent ? parseNode(rows[pos].indent) : null;
        } else {
          obj[key] = yamlScalar(val);
        }
      }
      return obj;
    }
    function parseList(indent) {
      const arr = [];
      while (pos < rows.length && rows[pos].indent === indent && rows[pos].text.startsWith('- ')) {
        const row = rows[pos];
        const rest = row.text.slice(2).trim();
        if (rest === '') {
          pos++;
          arr.push(parseNode(rows[pos] ? rows[pos].indent : indent + 2));
        } else if (/^[^:]+:\s/.test(rest) || /^[^:]+:$/.test(rest)) {
          // inline map start ("- key: value") — re-emit as a map row at a deeper indent
          row.indent = indent + 2;
          row.text = rest;
          arr.push(parseMap(indent + 2));
        } else {
          pos++;
          arr.push(yamlScalar(rest));
        }
      }
      return arr;
    }
    const out = parseNode(0);
    if (out == null || typeof out !== 'object') {
      const e = new Error('YAML を解釈できません');
      e.line = 1;
      e.detail = 'マッピングまたはリストが必要です';
      throw e;
    }
    return out;
  }

  // ---- minimal CSV parser (header row + records) ----
  function parseCsv(src) {
    const lines = src.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) {
      const e = new Error('CSV が空です');
      e.line = 1;
      e.detail = '先頭行にヘッダーが必要です';
      throw e;
    }
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].includes(',')) {
        const e = new Error('CSV として解析できません');
        e.line = i + 1;
        e.detail = '区切り文字 (,) が見つかりません — この行は CSV の形式ではありません';
        throw e;
      }
    }
    const header = lines[0].split(',').map(s => s.trim());
    const rows = lines.slice(1).map(line => {
      const cells = line.split(',').map(s => s.trim());
      const o = {};
      header.forEach((h, i) => {
        o[h] = cells[i] !== undefined ? cells[i] : '';
      });
      return o;
    });
    return {
      header,
      rows
    };
  }
  function parseByFormat(text, format) {
    if (format === 'yaml') return parseYaml(text);
    if (format === 'csv') return parseCsv(text);
    return parseToml(text);
  }

  // Try every format; return the first that parses (for the "auto-detect" helper).
  function detectFormat(text) {
    for (const f of ['toml', 'yaml', 'csv']) {
      try {
        parseByFormat(text, f);
        return f;
      } catch (e) {/* keep trying */}
    }
    return null;
  }

  // ---- public: compute everything the editor needs ----
  function compute(dataText, format, tplText) {
    const result = {
      ok: true,
      error: null,
      output: '',
      json: '',
      vars: [],
      interfaces: 0,
      keys: 0,
      suggest: null
    };
    let ctx;
    try {
      ctx = parseByFormat(dataText, format);
    } catch (e) {
      // a parse failure here is the format-mismatch story: suggest the format that DOES parse
      const suggest = detectFormat(dataText);
      result.ok = false;
      result.suggest = suggest && suggest !== format ? suggest : null;
      result.error = {
        line: e.line || 1,
        title: format.toUpperCase() + ' として解析できません',
        detail: e.detail || e.message
      };
      return result;
    }
    result.json = JSON.stringify(ctx, null, 2);
    result.keys = Object.keys(ctx).length;
    result.interfaces = ctx.interfaces ? Object.keys(ctx.interfaces).length : 0;
    result.vars = extractVars(tplText);
    try {
      result.output = tidy(render(tplText, ctx));
    } catch (e) {
      result.ok = false;
      result.error = {
        line: null,
        title: e.message,
        detail: e.detail || 'テンプレートを確認してください',
        pane: 'tpl',
        varName: e.varName
      };
    }
    return result;
  }
  function firstSectionLine(src) {
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) if (/^\s*\[.+\]\s*$/.test(lines[i])) return i + 1;
    return 1;
  }
  window.CGEngine = {
    compute,
    parseToml,
    parseYaml,
    parseCsv,
    detectFormat,
    render,
    extractVars
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "redesign/engine.js", error: String((e && e.message) || e) }); }

// redesign/templates.js
try { (() => {
/* global window */
// Template library entries for Command Ghostwriter (redesign). Each entry carries
// metadata for the library cards plus the actual data + template content used to
// seed the editor. Only 'cisco-switchport' runs through the live engine; the rest
// open in the editor with their sample content shown.

window.CGTemplates = [{
  id: 'cisco-switchport',
  name: 'Cisco スイッチポート設定',
  desc: 'インターフェースの mode / VLAN / description から、CLI を含む設定手順書（Markdown）を生成。',
  category: 'network',
  format: 'toml',
  output: 'markdown',
  updated: '2026-06-28',
  live: true,
  data: window.CG ? window.CG.configToml : '',
  template: window.CG ? window.CG.templateJ2 : ''
}, {
  id: 'yamaha-router',
  name: 'YAMAHA ルータ初期構築',
  desc: 'RTX系ルータの LAN / PPPoE / IPフィルタ / NAT 設定を、CLI を含む手順書（Markdown）として生成。',
  category: 'network',
  format: 'toml',
  output: 'markdown',
  updated: '2026-06-25',
  live: false,
  data: `[lan1]
ip_address = "192.168.100.1/24"

[pp1]
description = "INTERNET (PPPoE)"
auth_account = "user@example.ne.jp"
auth_password = "********"
mtu = 1454

[[static_routes]]
network = "default"
gateway = "pp 1"

[nat]
type = "masquerade"
inner = "192.168.100.0/24"

[[filters]]
id = 200000
action = "pass"
proto = "tcp"
dst_port = "established"

[[filters]]
id = 200099
action = "reject"
proto = "*"`,
  template: `# YAMAHA RTX 初期構築手順

RTX 系ルータに PPPoE 接続・IP フィルタ・NAT を設定します。コンソール接続のうえ administrator モードで実施してください。

## 1. LAN 側インターフェース

内部ネットワークのアドレスを設定します。

\`\`\`bash
ip lan1 address {{ lan1.ip_address }}
\`\`\`

## 2. PPPoE 接続を構成する

プロバイダの認証情報で WAN 側（lan2）の PPPoE セッションを設定します。

\`\`\`bash
pp select 1
 description {{ pp1.description }}
 pppoe use lan2
 pp auth accept pap chap
 pp auth myname {{ pp1.auth_account }} {{ pp1.auth_password }}
 ppp lcp mru on {{ pp1.mtu }}
 ip pp mtu {{ pp1.mtu }}
{% for f in filters %} ip filter {{ f.id }} {{ f.action }} * * {{ f.proto }}
{% endfor %} pp enable 1
\`\`\`

## 3. 経路を設定する

デフォルトルートを PPPoE セッション向けに設定します。

\`\`\`bash
{% for r in static_routes %}ip route {{ r.network }} gateway {{ r.gateway }}
{% endfor %}\`\`\`

## 4. NAT（IPマスカレード）

内部ネットワークを WAN 側へ NAT します。

\`\`\`bash
nat descriptor type 1000 {{ nat.type }}
nat descriptor address inner 1000 {{ nat.inner }}
\`\`\`

## 5. 保存して再起動確認

\`\`\`bash
save
\`\`\``
}, {
  id: 'linux-init',
  name: 'Linux 初期セットアップ',
  desc: 'ホスト名・ユーザー・SSH・タイムゾーン・パッケージ・ufw の初期化を、CLI を含む手順書（Markdown）として生成。',
  category: 'server',
  format: 'yaml',
  output: 'markdown',
  updated: '2026-06-22',
  live: false,
  data: `hostname: web-prod-01
timezone: Asia/Tokyo
users:
  - name: ops
    groups: sudo
    pubkey: "ssh-ed25519 AAAA..."
packages:
  - curl
  - vim
  - fail2ban
sshd:
  permit_root_login: false
  password_auth: false
firewall:
  - 22/tcp
  - 80/tcp
  - 443/tcp`,
  template: `# Linux 初期セットアップ手順 — {{ hostname }}

新規ホスト **{{ hostname }}** の初期化手順です。root 権限（sudo）で上から順に実行してください。

## 1. ホスト名とタイムゾーン

\`\`\`bash
hostnamectl set-hostname {{ hostname }}
timedatectl set-timezone {{ timezone }}
\`\`\`

## 2. 作業ユーザーを作成する

公開鍵認証用に SSH 鍵を配置します。

\`\`\`bash
{% for u in users %}useradd -m -s /bin/bash -G {{ u.groups }} {{ u.name }}
install -d -m 700 /home/{{ u.name }}/.ssh
echo "{{ u.pubkey }}" > /home/{{ u.name }}/.ssh/authorized_keys
{% endfor %}\`\`\`

## 3. パッケージを導入する

\`\`\`bash
apt-get update
apt-get install -y {{ packages | join(' ') }}
\`\`\`

## 4. SSH を堅牢化する

root ログインとパスワード認証を無効化し、設定を反映します。

\`\`\`bash
sed -i 's/^#\\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload sshd
\`\`\`

> パスワード認証を切る前に、鍵での SSH ログインができることを必ず確認してください。

## 5. ファイアウォールを有効化する

\`\`\`bash
{% for port in firewall %}ufw allow {{ port }}
{% endfor %}ufw --force enable
\`\`\``
}, {
  id: 'dns-zone',
  name: 'DNS ゾーンファイル初期化',
  desc: '$ORIGIN / $TTL / SOA / NS / MX / A / 各種 TXT を含むゾーンを、登録・反映手順書（Markdown）として生成。',
  category: 'dns',
  format: 'toml',
  output: 'markdown',
  updated: '2026-06-30',
  live: false,
  data: `origin = "example.com."
ttl = 3600
nameservers = ["ns1.example.com.", "ns2.example.com."]

[soa]
primary_ns = "ns1.example.com."
admin = "hostmaster.example.com."
serial = 2026063001
refresh = 7200
retry = 3600
expire = 1209600
minimum = 3600

[[mx]]
priority = 10
host = "mail.example.com."

[[mx]]
priority = 20
host = "mail2.example.com."

[[a]]
name = "@"
ip = "203.0.113.10"

[[a]]
name = "www"
ip = "203.0.113.10"

[[a]]
name = "mail"
ip = "203.0.113.25"

[spf]
includes = ["_spf.google.com", "spf.protection.outlook.com"]
all = "~all"

[dkim]
selector = "default"
public_key = "v=DKIM1; k=rsa; p=MIIBIjANBgkqh..."

[dmarc]
policy = "quarantine"
rua = "mailto:dmarc@example.com"
pct = 100`,
  template: `# DNS ゾーンファイル初期化手順 — {{ origin }}

権威 DNS サーバー（BIND）に **{{ origin }}** のゾーンを初期化します。SOA / NS / MX / A と送信者認証 TXT（SPF・DKIM・DMARC）を含みます。

## 1. ゾーンファイルを作成する

\`/var/named/db.{{ origin }}\` として以下を保存します。レコードを更新したら SOA の serial も必ず進めてください。

\`\`\`dns
$ORIGIN {{ origin }}
$TTL {{ ttl }}
;
; ----- SOA -----
@       IN SOA {{ soa.primary_ns }} {{ soa.admin }} (
                {{ soa.serial }}    ; serial
                {{ soa.refresh }}   ; refresh
                {{ soa.retry }}     ; retry
                {{ soa.expire }}    ; expire
                {{ soa.minimum }} ) ; minimum
;
; ----- NS -----
{% for ns in nameservers %}@       IN NS   {{ ns }}
{% endfor %};
; ----- MX -----
{% for r in mx %}@       IN MX   {{ r.priority }} {{ r.host }}
{% endfor %};
; ----- A -----
{% for r in a %}{{ r.name }}     IN A    {{ r.ip }}
{% endfor %};
; ----- TXT (sender authentication) -----
@       IN TXT  "v=spf1 {% for inc in spf.includes %}include:{{ inc }} {% endfor %}{{ spf.all }}"
{{ dkim.selector }}._domainkey IN TXT "{{ dkim.public_key }}"
_dmarc  IN TXT  "v=DMARC1; p={{ dmarc.policy }}; rua={{ dmarc.rua }}; pct={{ dmarc.pct }}"
\`\`\`

## 2. named.conf にゾーンを登録する

\`\`\`bash
cat >> /etc/named.conf <<'EOF'
zone "{{ origin }}" IN {
    type master;
    file "/var/named/db.{{ origin }}";
};
EOF
\`\`\`

## 3. 構文チェックと反映

ゾーンと設定を検証し、問題がなければ named をリロードします。

\`\`\`bash
named-checkzone {{ origin }} /var/named/db.{{ origin }}
named-checkconf
rndc reload {{ origin }}
\`\`\`

## 4. 反引き確認

\`\`\`bash
dig @{{ soa.primary_ns }} {{ origin }} SOA +short
dig @{{ soa.primary_ns }} {{ origin }} MX +short
\`\`\``
}, {
  id: 'incident-campus',
  name: 'キャンパスネットワーク障害対応',
  desc: '症状・影響範囲・切り分けステップ・エスカレーションから Markdown 手順書を生成。',
  category: 'runbook',
  format: 'yaml',
  output: 'markdown',
  updated: '2026-06-18',
  live: false,
  data: `title: 特定棟でネットワーク接続不可
scope: 工学部3号館 全フロア
severity: high
steps:
  - layer: 物理
    check: 該当棟エッジSWのリンク/電源ランプを確認
    ok: 隣接フロアへ
    ng: SW再起動・ケーブル交換
  - layer: L2
    check: アップリンクのVLAN/STP状態を確認
    ok: L3へ
    ng: トランク設定・ループを是正
  - layer: L3/DHCP
    check: クライアントのIP取得とGW疎通を確認
    ok: 上位/外部へ
    ng: DHCPスコープ枯渇・リレーを確認
escalation: ネットワーク基盤チーム (内線 1234)`,
  template: `# 障害対応手順書: {{ title }}

- **影響範囲**: {{ scope }}
- **重要度**: {{ severity }}

## 切り分けステップ
{% for s in steps %}
### {{ s.layer }} レイヤ
1. **確認**: {{ s.check }}
   - 正常な場合 → {{ s.ok }}
   - 異常な場合 → {{ s.ng }}
{% endfor %}

## エスカレーション
解決しない場合は **{{ escalation }}** へ連絡する。`
}, {
  id: 'incident-proxy',
  name: 'プロキシ環境のWebサービス接続不能',
  desc: 'プロキシ設定・確認コマンド・判断分岐から Markdown 切り分け手順書を生成。',
  category: 'runbook',
  format: 'yaml',
  output: 'markdown',
  updated: '2026-06-15',
  live: false,
  data: `title: 社内プロキシ経由で特定SaaSに接続できない
proxy: "http://proxy.corp.local:8080"
no_proxy: ".corp.local,127.0.0.1"
steps:
  - check: 環境変数 http_proxy/https_proxy が設定されているか
    cmd: "env | grep -i proxy"
    branch: 未設定なら export して再試行
  - check: プロキシまでの到達性
    cmd: "curl -x $http_proxy -I https://example-saas.com"
    branch: 407 ならプロキシ認証情報を確認
  - check: 宛先がプロキシ除外に含まれていないか
    cmd: "echo $no_proxy"
    branch: 除外に含まれる場合は直結経路を確認
  - check: TLS/証明書の検査
    cmd: "openssl s_client -connect example-saas.com:443 -proxy proxy.corp.local:8080"
    branch: 証明書エラーなら社内CAを導入`,
  template: `# 切り分け手順書: {{ title }}

- **プロキシ**: \`{{ proxy }}\`
- **除外 (no_proxy)**: \`{{ no_proxy }}\`

## 確認手順
{% for s in steps %}
{{ loop_index }}. **{{ s.check }}**
   \`\`\`
   {{ s.cmd }}
   \`\`\`
   → {{ s.branch }}
{% endfor %}`
}];
})(); } catch (e) { __ds_ns.__errors.push({ path: "redesign/templates.js", error: String((e && e.message) || e) }); }

// ui_kits/command-ghostwriter/App.jsx
try { (() => {
/* global React, Sidebar, GenerateTab, DebugTab, SettingsTab, SamplesTab, WorkflowTab */
const {
  Tabs
} = window.CommandGhostwriterDesignSystem_0d5f31;
const TABS = [{
  id: 'gen',
  icon: '📝',
  label: 'コマンド生成'
}, {
  id: 'debug',
  icon: '📜',
  label: '設定デバッグ'
}, {
  id: 'settings',
  icon: '⚙️',
  label: '詳細設定'
}, {
  id: 'samples',
  icon: '💼',
  label: 'サンプル集'
}, {
  id: 'flow',
  icon: '🔀',
  label: 'ワークフロー'
}];
function App() {
  const [tab, setTab] = React.useState('gen');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--cg-bg)'
    }
  }, /*#__PURE__*/React.createElement(Sidebar, null), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minWidth: 0,
      padding: 'var(--space-8) var(--space-12)'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-3xl)',
      fontWeight: 700,
      color: 'var(--cg-text)',
      letterSpacing: '-.01em',
      margin: '0 0 var(--space-6)'
    }
  }, "Command ghostwriter ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.9em'
    }
  }, "\uD83D\uDC7B")), /*#__PURE__*/React.createElement(Tabs, {
    value: tab,
    onChange: setTab,
    tabs: TABS,
    style: {
      marginBottom: 'var(--space-8)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1040
    }
  }, tab === 'gen' && /*#__PURE__*/React.createElement(GenerateTab, null), tab === 'debug' && /*#__PURE__*/React.createElement(DebugTab, null), tab === 'settings' && /*#__PURE__*/React.createElement(SettingsTab, null), tab === 'samples' && /*#__PURE__*/React.createElement(SamplesTab, null), tab === 'flow' && /*#__PURE__*/React.createElement(WorkflowTab, null))));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/command-ghostwriter/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/command-ghostwriter/DebugTab.jsx
try { (() => {
/* global React */
// Tab 2 — 設定デバッグ. Upload a config file and inspect the parsed result
// as visual JSON, TOML, or YAML.
const {
  Card,
  FileUploader,
  Button,
  Alert,
  CodeBlock,
  Badge
} = window.CommandGhostwriterDesignSystem_0d5f31;
const PARSED_JSON = `{
  "global": {
    "hostname": "SAMPLE-ROUTER-001",
    "vlans": [10, 20, 30, 99],
    "password": { "enable": "P@ssw0rd" }
  },
  "interfaces": {
    "GigabitEthernet0/1": {
      "mode": "access",
      "access_vlan": 10,
      "description": "admin office",
      "cdp_enable": false
    },
    "GigabitEthernet0/19": {
      "mode": "trunk",
      "native_vlan": 99,
      "description": "access point #2",
      "cdp_enable": true
    }
  }
}`;
const PARSED_YAML = `global:
  hostname: SAMPLE-ROUTER-001
  vlans: [10, 20, 30, 99]
  password:
    enable: P@ssw0rd
interfaces:
  GigabitEthernet0/1:
    mode: access
    access_vlan: 10
    description: admin office
    cdp_enable: false`;
function DebugTab() {
  const [view, setView] = React.useState(null); // null | visual | toml | yaml

  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-xl)',
      fontWeight: 700,
      color: 'var(--cg-text)',
      margin: '0 0 var(--space-2)'
    }
  }, "\uD83D\uDCDC \u69CB\u6587\u89E3\u6790\u306B\u3088\u308B\u8A2D\u5B9A\u30C7\u30D0\u30C3\u30B0"), /*#__PURE__*/React.createElement("hr", {
    className: "cg-rainbow-divider",
    style: {
      margin: '0 0 var(--space-6)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--space-4)',
      marginBottom: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(FileUploader, {
    label: "\u8A2D\u5B9A\u5B9A\u7FA9\u30D5\u30A1\u30A4\u30EB\u3092\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9",
    accept: "TOML, YAML, CSV",
    fileName: "cisco_config.toml",
    fileSize: "889 B"
  })), /*#__PURE__*/React.createElement("div", null)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 'var(--space-4)',
      marginBottom: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    fullWidth: true,
    onClick: () => setView('visual')
  }, "\u89E3\u6790\u7D50\u679C\u306E\u8868\u793A (visual)"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    fullWidth: true,
    onClick: () => setView('toml')
  }, "\u89E3\u6790\u7D50\u679C\u306E\u8868\u793A (toml)"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    fullWidth: true,
    onClick: () => setView('yaml')
  }, "\u89E3\u6790\u7D50\u679C\u306E\u8868\u793A (yaml)")), view && /*#__PURE__*/React.createElement(Alert, {
    tone: "success",
    style: {
      marginBottom: 'var(--space-3)'
    }
  }, "\u8A2D\u5B9A\u5B9A\u7FA9\u30D5\u30A1\u30A4\u30EB\u89E3\u6790\u306B\u6210\u529F"), view === 'visual' && /*#__PURE__*/React.createElement(Card, {
    padding: "var(--space-3)"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-2)',
      marginBottom: 'var(--space-3)'
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "brand"
  }, "2 keys"), /*#__PURE__*/React.createElement(Badge, {
    tone: "info"
  }, "8 interfaces")), /*#__PURE__*/React.createElement(CodeBlock, {
    title: "parsed config",
    language: "json"
  }, PARSED_JSON)), view === 'toml' && /*#__PURE__*/React.createElement(CodeBlock, {
    title: "\u8A2D\u5B9A\u5B9A\u7FA9\u30D5\u30A1\u30A4\u30EB\u306E\u89E3\u6790\u7D50\u679C",
    language: "toml"
  }, PARSED_YAML.replace(/:/g, ' =')), view === 'yaml' && /*#__PURE__*/React.createElement(CodeBlock, {
    title: "\u8A2D\u5B9A\u5B9A\u7FA9\u30D5\u30A1\u30A4\u30EB\u306E\u89E3\u6790\u7D50\u679C",
    language: "yaml"
  }, PARSED_YAML), !view && /*#__PURE__*/React.createElement(Alert, {
    tone: "info"
  }, "\u8A2D\u5B9A\u5B9A\u7FA9\u30D5\u30A1\u30A4\u30EB\u3092\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u3057\u3001\u8868\u793A\u5F62\u5F0F\u3092\u9078\u629E\u3057\u3066\u304F\u3060\u3055\u3044"));
}
window.DebugTab = DebugTab;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/command-ghostwriter/DebugTab.jsx", error: String((e && e.message) || e) }); }

// ui_kits/command-ghostwriter/GenerateTab.jsx
try { (() => {
/* global React */
// Tab 1 — コマンド生成. Upload a config + a Jinja template, then generate
// CLI commands or Markdown. This is the heart of the app.
const {
  Card,
  FileUploader,
  Button,
  Alert,
  TextArea
} = window.CommandGhostwriterDesignSystem_0d5f31;
const GENERATED_CLI = `! ==== SAMPLE-ROUTER-001 ====
hostname SAMPLE-ROUTER-001
vlan 10,20,30,99
!
interface GigabitEthernet0/1
 description admin office
 switchport mode access
 switchport access vlan 10
 no cdp enable
!
interface GigabitEthernet0/2
 description accounting office
 switchport mode access
 switchport access vlan 20
 no cdp enable
!
interface GigabitEthernet0/19
 description access point #2
 switchport mode trunk
 switchport trunk native vlan 99
!
interface GigabitEthernet0/24
 description uplink #1
 switchport mode trunk
!
end`;
function GenerateTab() {
  const [config, setConfig] = React.useState(true); // demo starts pre-loaded
  const [template, setTemplate] = React.useState(true);
  const [result, setResult] = React.useState(null); // null | "text" | "md"

  const ready = config && template;
  const generate = mode => {
    if (ready) setResult(mode);
  };
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-xl)',
      fontWeight: 700,
      color: 'var(--cg-text)',
      margin: '0 0 var(--space-2)'
    }
  }, "\uD83D\uDCDD \u30D5\u30A1\u30A4\u30EB\u306E\u7D44\u307F\u5408\u308F\u305B\u306B\u3088\u308B\u30B3\u30DE\u30F3\u30C9\u751F\u6210"), /*#__PURE__*/React.createElement("hr", {
    className: "cg-rainbow-divider",
    style: {
      margin: '0 0 var(--space-6)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--space-4)',
      marginBottom: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(FileUploader, {
    label: "\u8A2D\u5B9A\u5B9A\u7FA9\u30D5\u30A1\u30A4\u30EB\u3092\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9",
    accept: "TOML, YAML, CSV",
    fileName: config ? 'cisco_config.toml' : null,
    fileSize: "889 B",
    onBrowse: () => setConfig(true)
  })), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(FileUploader, {
    label: "Jinja\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u30D5\u30A1\u30A4\u30EB\u3092\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9",
    accept: "J2, JINJA2",
    fileName: template ? 'cisco_switchport.j2' : null,
    fileSize: "412 B",
    onBrowse: () => setTemplate(true)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 'var(--space-4)',
      marginBottom: 'var(--space-6)'
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    fullWidth: true,
    icon: "\uD83D\uDCDD",
    onClick: () => generate('text')
  }, "CLI\u30B3\u30DE\u30F3\u30C9\u751F\u6210"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    fullWidth: true,
    onClick: () => generate('md')
  }, "Markdown\u751F\u6210"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    fullWidth: true,
    icon: "\u2B07",
    disabled: !result
  }, "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9")), !ready && /*#__PURE__*/React.createElement(Alert, {
    tone: "warning"
  }, "\u5FC5\u8981\u306A\u5168\u30D5\u30A1\u30A4\u30EB\u304C\u63C3\u3063\u3066\u3044\u307E\u305B\u3093"), ready && result === 'text' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Alert, {
    tone: "success",
    style: {
      marginBottom: 'var(--space-3)'
    }
  }, "CLI\u30B3\u30DE\u30F3\u30C9\u751F\u6210\u306B\u6210\u529F"), /*#__PURE__*/React.createElement(Card, {
    padding: "var(--space-3)"
  }, /*#__PURE__*/React.createElement(TextArea, {
    label: "CLI\u30B3\u30DE\u30F3\u30C9\u751F\u6210\u306E\u51FA\u529B\u7D50\u679C",
    value: GENERATED_CLI,
    rows: 16,
    readOnly: true
  }))), ready && result === 'md' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Alert, {
    tone: "success",
    style: {
      marginBottom: 'var(--space-3)'
    }
  }, "Markdown\u751F\u6210\u306B\u6210\u529F"), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement("h3", {
    style: {
      marginTop: 0,
      color: 'var(--cg-text)',
      fontFamily: 'var(--font-sans)'
    }
  }, "\u30B5\u30FC\u30D0\u30FC\u76E3\u8996\u624B\u9806\u66F8"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--cg-text-muted)',
      fontSize: 'var(--text-sm)',
      margin: '0 0 var(--space-3)'
    }
  }, "SAMPLE-ROUTER-001 \u2014 8 interfaces configured across VLAN 10/20/30/99."), /*#__PURE__*/React.createElement(TextArea, {
    value: GENERATED_CLI,
    rows: 10,
    readOnly: true
  }))));
}
window.GenerateTab = GenerateTab;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/command-ghostwriter/GenerateTab.jsx", error: String((e && e.message) || e) }); }

// ui_kits/command-ghostwriter/SamplesTab.jsx
try { (() => {
/* global React */
// Tab 4 — サンプル集. Read-only gallery of the bundled example files.
const {
  CodeBlock,
  Badge
} = window.CommandGhostwriterDesignSystem_0d5f31;
const SAMPLES = [{
  name: 'cisco_config.toml',
  lang: 'toml',
  body: `[global]
hostname = "SAMPLE-ROUTER-001"
vlans = [10, 20, 30, 99]

[interfaces."GigabitEthernet0/1"]
mode = "access"
access_vlan = 10
description = "admin office"
cdp_enable = false`
}, {
  name: 'dns_dig_config.csv',
  lang: 'csv',
  body: `resolver,fqdn,type
1.1.1.1,www.yahoo.co.jp,a
1.1.1.1,yahoo.co.jp,mx
8.8.8.8,gmail.com,txt
8.8.8.8,_dmarc.gmail.com,txt`
}, {
  name: 'success_config.yaml',
  lang: 'yaml',
  body: `url: "https://example.com/samplefile.txt"
date: 2024-04-01
users:
  test:
    first_name: "太郎"
    last_name: "テスト"`
}];
function SamplesTab() {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-xl)',
      fontWeight: 700,
      color: 'var(--cg-text)',
      margin: '0 0 var(--space-2)'
    }
  }, "\uD83D\uDCBC \u30B5\u30F3\u30D7\u30EB\u96C6\u306E\u8868\u793A"), /*#__PURE__*/React.createElement("hr", {
    className: "cg-rainbow-divider",
    style: {
      margin: '0 0 var(--space-6)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-5)'
    }
  }, SAMPLES.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.name
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-3)',
      marginBottom: 'var(--space-2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-base)',
      fontWeight: 600,
      color: 'var(--cg-text)'
    }
  }, s.name), /*#__PURE__*/React.createElement(Badge, {
    tone: "brand"
  }, s.lang.toUpperCase())), /*#__PURE__*/React.createElement(CodeBlock, {
    language: s.lang
  }, s.body)))));
}
window.SamplesTab = SamplesTab;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/command-ghostwriter/SamplesTab.jsx", error: String((e && e.message) || e) }); }

// ui_kits/command-ghostwriter/SettingsTab.jsx
try { (() => {
/* global React */
// Tab 3 — 詳細設定. Input / output file settings: NaN handling, strict
// undefined, transcoding, output format, encoding, filename, extension.
const {
  Card,
  Toggle,
  TextInput,
  Selectbox,
  RadioGroup
} = window.CommandGhostwriterDesignSystem_0d5f31;
const FORMAT_OPTIONS = ['0: フォーマット指定無し', '1: 半角スペースを一部削除', '2: 余分な改行を一部削除', '3: 半角スペースと余分な改行を一部削除', '4: 半角スペースの一部と余分な改行を全て削除'];
function Group({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--cg-border)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)'
    }
  }, children);
}
function SettingsTab() {
  const [rows, setRows] = React.useState('csv_rows');
  const [fillNan, setFillNan] = React.useState(true);
  const [nanWith, setNanWith] = React.useState('#');
  const [strict, setStrict] = React.useState(true);
  const [auto, setAuto] = React.useState(true);
  const [fmt, setFmt] = React.useState(FORMAT_OPTIONS[3]);
  const [enc, setEnc] = React.useState('Shift_JIS');
  const [fname, setFname] = React.useState('command');
  const [ts, setTs] = React.useState(true);
  const [ext, setExt] = React.useState('txt');
  const heading = t => /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-lg)',
      fontWeight: 600,
      color: 'var(--cg-text)',
      margin: '0 0 var(--space-3)'
    }
  }, t);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-xl)',
      fontWeight: 700,
      color: 'var(--cg-text)',
      margin: '0 0 var(--space-2)'
    }
  }, "\u2699\uFE0F \u8A73\u7D30\u8A2D\u5B9A"), /*#__PURE__*/React.createElement("hr", {
    className: "cg-rainbow-divider",
    style: {
      margin: '0 0 var(--space-6)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--space-4)'
    }
  }, /*#__PURE__*/React.createElement(Card, null, heading('入力ファイルの設定'), /*#__PURE__*/React.createElement(Group, null, /*#__PURE__*/React.createElement(TextInput, {
    label: "CSV\u306Efor\u30EB\u30FC\u30D7\u5BFE\u8C61\u306E\u5909\u6570\u540D",
    value: rows,
    onChange: setRows
  })), /*#__PURE__*/React.createElement(Group, null, /*#__PURE__*/React.createElement(Toggle, {
    checked: fillNan,
    label: "CSV\u306E\u6B20\u640D\u5024(NaN)\u3092\u6307\u5B9A\u6587\u5B57\u3068\u3057\u3066\u6271\u3046",
    onChange: setFillNan
  }), /*#__PURE__*/React.createElement(TextInput, {
    label: "\u6B20\u640D\u5024(NaN)\u306E\u5909\u63DB\u5F8C\u306E\u6587\u5B57",
    value: nanWith,
    onChange: setNanWith
  })), /*#__PURE__*/React.createElement(Group, null, /*#__PURE__*/React.createElement(Toggle, {
    checked: strict,
    label: "\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u306E\u5909\u6570\u30C1\u30A7\u30C3\u30AF\u53B3\u683C\u5316",
    onChange: setStrict
  })), /*#__PURE__*/React.createElement(Group, null, /*#__PURE__*/React.createElement(Toggle, {
    checked: auto,
    label: "UTF-8\u4EE5\u5916\u306E\u6587\u5B57\u30B3\u30FC\u30C9\u3092\u81EA\u52D5\u5224\u5B9A\u3057\u3066\u8AAD\u307F\u8FBC\u3080",
    onChange: setAuto
  }))), /*#__PURE__*/React.createElement(Card, null, heading('出力ファイルの設定'), /*#__PURE__*/React.createElement(Group, null, /*#__PURE__*/React.createElement(Selectbox, {
    label: "\u51FA\u529B\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8",
    value: fmt,
    options: FORMAT_OPTIONS,
    onChange: setFmt
  }), /*#__PURE__*/React.createElement(Selectbox, {
    label: "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u30D5\u30A1\u30A4\u30EB\u306E\u6587\u5B57\u30B3\u30FC\u30C9",
    value: enc,
    options: ['Shift_JIS', 'utf-8'],
    onChange: setEnc
  })), /*#__PURE__*/React.createElement(Group, null, /*#__PURE__*/React.createElement(TextInput, {
    label: "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u6642\u306E\u30D5\u30A1\u30A4\u30EB\u540D",
    value: fname,
    onChange: setFname
  }), /*#__PURE__*/React.createElement(Toggle, {
    checked: ts,
    label: "\u30D5\u30A1\u30A4\u30EB\u540D\u306E\u672B\u5C3E\u306B\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u3092\u4ED8\u4E0E",
    onChange: setTs
  }), /*#__PURE__*/React.createElement(RadioGroup, {
    label: "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u6642\u306E\u30D5\u30A1\u30A4\u30EB\u62E1\u5F35\u5B50",
    value: ext,
    options: ['txt', 'md'],
    horizontal: true,
    onChange: setExt
  })))));
}
window.SettingsTab = SettingsTab;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/command-ghostwriter/SettingsTab.jsx", error: String((e && e.message) || e) }); }

// ui_kits/command-ghostwriter/Sidebar.jsx
try { (() => {
/* global React */
// Sidebar — mirrors Streamlit's st.sidebar: welcome blurb + an expander
// listing the syntax docs for each input file format.
const {
  Divider
} = window.CommandGhostwriterDesignSystem_0d5f31;
function Sidebar() {
  const [open, setOpen] = React.useState(true);
  const link = (label, href) => /*#__PURE__*/React.createElement("a", {
    href: href,
    target: "_blank",
    rel: "noreferrer",
    style: {
      display: 'block',
      color: 'var(--cg-info)',
      textDecoration: 'none',
      fontSize: 'var(--text-sm)',
      padding: '3px 0'
    }
  }, label);
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 'var(--sidebar-width)',
      flexShrink: 0,
      background: 'var(--cg-bg-secondary)',
      borderRight: '1px solid var(--cg-border)',
      padding: 'var(--space-6)',
      minHeight: '100%',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--leading-normal)',
      color: 'var(--cg-text)',
      margin: '0 0 var(--space-5)'
    }
  }, "\u3053\u306E\u30A2\u30D7\u30EA\u30B1\u30FC\u30B7\u30E7\u30F3\u3067\u306F\u3001\u5B9A\u578B\u4F5C\u696D\u306ECLI\u30B3\u30DE\u30F3\u30C9\u6E96\u5099\u306B\u3042\u305F\u308A\u3001\u8A2D\u5B9A\u5B9A\u7FA9\u30D5\u30A1\u30A4\u30EB (toml/yaml/csv)\u3068Jinja\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u30D5\u30A1\u30A4\u30EB\u306E\u7D44\u307F\u5408\u308F\u305B\u306B\u3088\u308A\u3001\u6E96\u5099\u3092\u52B9\u7387\u5316\u3067\u304D\u307E\u3059\u3002"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--leading-normal)',
      color: 'var(--cg-text-muted)',
      margin: '0 0 var(--space-6)'
    }
  }, "\u5404\u30D5\u30A1\u30A4\u30EB\u3092\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u3057\u3001\u300CCLI\u30B3\u30DE\u30F3\u30C9\u751F\u6210\u300D\u3092\u30AF\u30EA\u30C3\u30AF\u3057\u3066\u7D50\u679C\u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002"), /*#__PURE__*/React.createElement("div", {
    style: {
      border: '1px solid var(--cg-border)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
      background: 'var(--cg-bg)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(o => !o),
    style: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: 'var(--space-3) var(--space-4)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-sm)',
      fontWeight: 600,
      color: 'var(--cg-text)'
    }
  }, "\u5404\u30D5\u30A1\u30A4\u30EB\u306E\u69CB\u6587", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--cg-text-muted)',
      transform: open ? 'rotate(180deg)' : 'none',
      transition: 'transform var(--dur-base)'
    }
  }, "\u25BE")), open && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 var(--space-4) var(--space-3)'
    }
  }, link('toml syntax docs', 'https://toml.io/ja/v1.0.0'), link('yaml syntax docs', 'https://docs.ansible.com/'), link('jinja syntax docs', 'https://jinja.palletsprojects.com/'))));
}
window.Sidebar = Sidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/command-ghostwriter/Sidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/command-ghostwriter/WorkflowTab.jsx
try { (() => {
/* global React */
// Tab 5 — ワークフロー. Shows the end-to-end flow: a senior engineer
// templatizes routine work; a junior fills in parameters and generates.
function Step({
  n,
  title,
  sub
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-3)',
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flexShrink: 0,
      width: 28,
      height: 28,
      borderRadius: '50%',
      background: 'var(--cg-red)',
      color: '#fff',
      display: 'grid',
      placeItems: 'center',
      fontFamily: 'var(--font-sans)',
      fontWeight: 700,
      fontSize: 'var(--text-sm)'
    }
  }, n), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 600,
      color: 'var(--cg-text)',
      fontSize: 'var(--text-base)'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      color: 'var(--cg-text-muted)',
      fontSize: 'var(--text-sm)',
      marginTop: 2
    }
  }, sub)));
}
function Lane({
  title,
  tone,
  children
}) {
  const tones = {
    orange: {
      bg: 'rgba(255,135,0,.08)',
      border: 'rgba(255,135,0,.3)',
      label: 'var(--cg-warning)'
    },
    green: {
      bg: 'var(--cg-success-bg)',
      border: 'var(--cg-success-border)',
      label: 'var(--cg-success)'
    },
    red: {
      bg: 'var(--cg-error-bg)',
      border: 'var(--cg-error-border)',
      label: 'var(--cg-red-tint)'
    }
  };
  const t = tones[tone];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: t.bg,
      border: `1px solid ${t.border}`,
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-5)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontWeight: 700,
      fontSize: 'var(--text-sm)',
      color: t.label,
      textTransform: 'uppercase',
      letterSpacing: '.04em',
      marginBottom: 'var(--space-4)'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-4)'
    }
  }, children));
}
function WorkflowTab() {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--text-xl)',
      fontWeight: 700,
      color: 'var(--cg-text)',
      margin: '0 0 var(--space-2)'
    }
  }, "\uD83D\uDD00 \u30EF\u30FC\u30AF\u30D5\u30ED\u30FC\u306E\u8868\u793A"), /*#__PURE__*/React.createElement("hr", {
    className: "cg-rainbow-divider",
    style: {
      margin: '0 0 var(--space-6)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 'var(--space-4)',
      alignItems: 'stretch'
    }
  }, /*#__PURE__*/React.createElement(Lane, {
    title: "\u5B9A\u578B\u4F5C\u696D\u306E\u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u5316",
    tone: "orange"
  }, /*#__PURE__*/React.createElement(Step, {
    n: "1",
    title: "\u904E\u53BB\u306E\u30B3\u30DE\u30F3\u30C9\u5C65\u6B74 / \u624B\u9806\u66F8",
    sub: "\u65E2\u5B58\u306E\u904B\u7528\u77E5\u8B58\u3092\u96C6\u3081\u308B"
  }), /*#__PURE__*/React.createElement(Step, {
    n: "2",
    title: "\u5909\u6570\u90E8\u5206\u306E\u7279\u5B9A\u3068\u62BD\u51FA",
    sub: "\u7E70\u308A\u8FD4\u3055\u308C\u308B\u5024\u3092\u5207\u308A\u51FA\u3059"
  }), /*#__PURE__*/React.createElement(Step, {
    n: "3",
    title: "\u8A2D\u5B9A\u5B9A\u7FA9\u30D5\u30A1\u30A4\u30EB + \u30C6\u30F3\u30D7\u30EC\u30FC\u30C8\u4F5C\u6210",
    sub: "toml/yaml/csv \u3068 Jinja \u3092\u7528\u610F"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      alignSelf: 'center',
      color: 'var(--cg-text-faint)',
      fontSize: 22
    }
  }, "\u2192"), /*#__PURE__*/React.createElement(Lane, {
    title: "\u30B7\u30CA\u30EA\u30AA\u306B\u57FA\u3065\u304F\u4F5C\u696D\u6E96\u5099",
    tone: "green"
  }, /*#__PURE__*/React.createElement(Step, {
    n: "4",
    title: "\u8A2D\u5B9A\u5B9A\u7FA9\u30D5\u30A1\u30A4\u30EB\u306E\u6E96\u5099",
    sub: "\u30D1\u30E9\u30E1\u30FC\u30BF\u30FC\u3092\u8A18\u5165"
  }), /*#__PURE__*/React.createElement(Step, {
    n: "5",
    title: "\u4E21\u30D5\u30A1\u30A4\u30EB\u3092\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9",
    sub: "config + template"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      alignSelf: 'center',
      color: 'var(--cg-text-faint)',
      fontSize: 22
    }
  }, "\u2192"), /*#__PURE__*/React.createElement(Lane, {
    title: "\u51FA\u529B",
    tone: "red"
  }, /*#__PURE__*/React.createElement(Step, {
    n: "6",
    title: "\u5B9F\u884C\u53EF\u80FD\u306A CLI\u30B3\u30DE\u30F3\u30C9",
    sub: "\u30B3\u30D4\u30FC & \u30DA\u30FC\u30B9\u30C8\u3067\u5B9F\u884C"
  }))));
}
window.WorkflowTab = WorkflowTab;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/command-ghostwriter/WorkflowTab.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Divider = __ds_scope.Divider;

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.CodeBlock = __ds_scope.CodeBlock;

__ds_ns.FileUploader = __ds_scope.FileUploader;

__ds_ns.RadioGroup = __ds_scope.RadioGroup;

__ds_ns.Selectbox = __ds_scope.Selectbox;

__ds_ns.TextArea = __ds_scope.TextArea;

__ds_ns.TextInput = __ds_scope.TextInput;

__ds_ns.Toggle = __ds_scope.Toggle;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
