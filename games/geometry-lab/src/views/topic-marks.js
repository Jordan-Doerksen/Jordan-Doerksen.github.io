// One line-art mark per topic. These are real constructions drawn small, not
// decorative thumbnails: the index leads with titles (D-034 card policy) and the
// mark only confirms which figure a row opens.
export function markFor(topicId) {
  if (topicId === "circle-intersections") {
    return `<svg viewBox="0 0 180 130" aria-hidden="true" focusable="false">
      <circle cx="68" cy="65" r="45"></circle><circle cx="112" cy="65" r="45"></circle>
      <path class="highlight" d="M90 25 A45 45 0 0 1 90 105 A45 45 0 0 1 90 25Z"></path>
    </svg>`;
  }
  if (topicId === "equilateral-triangle") {
    return `<svg viewBox="0 0 180 130" aria-hidden="true" focusable="false">
      <circle cx="68" cy="78" r="44"></circle><circle cx="112" cy="78" r="44"></circle>
      <path class="highlight solid" d="M68 78 L90 39.9 L112 78 Z"></path>
    </svg>`;
  }
  if (topicId === "euclid-first-proposition") {
    return `<svg viewBox="0 0 180 130" aria-hidden="true" focusable="false">
      <path d="M36 93 H144"></path><circle cx="66" cy="78" r="46"></circle>
      <circle cx="112" cy="78" r="46"></circle><text x="90" y="117">I · 1</text>
    </svg>`;
  }
  if (topicId === "recursive-branching") {
    return `<svg viewBox="0 0 180 130" aria-hidden="true" focusable="false">
      <path d="M90 122 L90 82 M90 82 L62 50 M90 82 L118 50 M62 50 L43 28 M62 50 L71 22 M118 50 L109 22 M118 50 L137 28"></path>
      <circle class="highlight solid" cx="90" cy="82" r="4"></circle>
    </svg>`;
  }
  if (topicId === "koch-curve") {
    return `<svg viewBox="0 0 180 130" aria-hidden="true" focusable="false">
      <path d="M12 94 L29 94 L37.5 79.3 L46 94 L63 94 L71.5 79.3 L63 64.6 L80 64.6 L88.5 49.9 L97 64.6 L114 64.6 L105.5 79.3 L114 94 L131 94 L139.5 79.3 L148 94 L165 94"></path>
    </svg>`;
  }
  if (topicId === "great-wave-echoes") {
    return `<svg viewBox="0 0 180 130" aria-hidden="true" focusable="false">
      <path d="M18 103 C32 31 115 20 142 73 C151 96 119 106 106 78"></path>
      <path class="highlight" d="M62 96 C75 50 126 45 142 76 C148 89 132 96 122 82"></path>
      <path d="M104 89 C113 65 143 64 151 80"></path>
    </svg>`;
  }
  if (topicId === "rescue-fractalus-terrain") {
    return `<svg viewBox="0 0 180 130" aria-hidden="true" focusable="false">
      <path class="highlight solid" d="M5 111 L5 88 L27 74 L49 88 L71 46 L93 70 L115 33 L137 81 L159 62 L175 86 L175 111 Z"></path>
      <line x1="5" y1="111" x2="175" y2="111"></line>
    </svg>`;
  }
  if (topicId === "regular-plane-tilings") return `<svg viewBox="0 0 180 130" aria-hidden="true" focusable="false"><path d="M10 30L40 30L25 4Z M45 8H75V38H45Z M110 7L135 7L148 29L135 51L110 51L97 29Z"/><text x="90" y="104">60° · 90° · 120°</text></svg>`;
  if (topicId === "hexagonal-circle-packing") return `<svg viewBox="0 0 180 130" aria-hidden="true" focusable="false"><circle cx="50" cy="65" r="24"/><circle cx="98" cy="65" r="24"/><circle cx="74" cy="23" r="24"/><circle cx="74" cy="107" r="24"/><circle cx="122" cy="23" r="24"/><circle cx="122" cy="107" r="24"/></svg>`;
  if (topicId === "kashan-star-cross") return `<svg viewBox="0 0 180 130" aria-hidden="true" focusable="false"><path class="highlight solid" d="M90 12L101 36L126 28L118 53L142 64L118 75L126 100L101 92L90 116L79 92L54 100L62 75L38 64L62 53L54 28L79 36Z"/></svg>`;
  if (topicId === "penrose-rhombs") return `<svg viewBox="0 0 180 130" aria-hidden="true" focusable="false"><path d="M90 65L90 12L120 48Z M90 65L140 49L123 81Z M90 65L121 108L84 96Z M90 65L59 108L58 72Z M90 65L40 49L75 43Z"/></svg>`;
  if (topicId === "escher-plane-division") return `<svg viewBox="0 0 180 130" aria-hidden="true" focusable="false"><path d="M8 24Q30 5 52 24T96 24T140 24T184 24 M8 65Q30 46 52 65T96 65T140 65T184 65 M8 106Q30 87 52 106T96 106T140 106T184 106"/></svg>`;
  if (topicId === "mirror-and-rotation") return `<svg viewBox="0 0 180 130" aria-hidden="true" focusable="false"><line x1="90" y1="14" x2="90" y2="116" stroke-dasharray="5 5"/><path class="highlight solid" d="M104 94 L104 36 L146 48 L112 58 Z"/><path d="M76 94 L76 36 L34 48 L68 58 Z"/></svg>`;
  if (topicId === "frieze-seven-ways") return `<svg viewBox="0 0 180 130" aria-hidden="true" focusable="false"><line x1="8" y1="88" x2="172" y2="88"/><path class="highlight solid" d="M20 84 L20 46 L44 52 L26 60 Z"/><path d="M80 84 L80 46 L104 52 L86 60 Z"/><path d="M140 84 L140 46 L164 52 L146 60 Z"/></svg>`;
  if (topicId === "wallpaper-seventeen") return `<svg viewBox="0 0 180 130" aria-hidden="true" focusable="false"><path class="highlight solid" d="M28 58 L28 24 L52 30 L34 38 Z"/><path class="highlight solid" d="M104 58 L104 24 L128 30 L110 38 Z"/><path d="M84 72 L84 106 L60 100 L78 92 Z"/><path d="M160 72 L160 106 L136 100 L154 92 Z"/></svg>`;
  if (topicId === "alhambra-count") return `<svg viewBox="0 0 180 130" aria-hidden="true" focusable="false"><path d="M90 12L101 36L126 28L118 53L142 64L118 75L126 100L101 92L90 116L79 92L54 100L62 75L38 64L62 53L54 28L79 36Z"/><rect class="highlight" x="74" y="48" width="32" height="32" transform="rotate(45 90 64)"/></svg>`;
  if (topicId === "tetris-tetrominoes") return `<svg viewBox="0 0 180 130" aria-hidden="true" focusable="false"><path class="highlight solid" d="M10 22h48v12H10z M70 16h24v24H70z M108 16h36v12h-12v12h-12V28h-12z M18 70h12V58h24v12H30v12H18z M72 58h12v12h24v12H72z M122 58h24v12h12v12h-36z"/></svg>`;
  return `<svg viewBox="0 0 180 130" aria-hidden="true" focusable="false">
    <path class="highlight solid" d="M90 16 L55 76 L125 76 Z"></path>
    <path class="highlight solid" d="M55 76 L20 136 L90 136 Z" transform="translate(0,-18)"></path>
    <path class="highlight solid" d="M125 76 L90 136 L160 136 Z" transform="translate(0,-18)"></path>
  </svg>`;
}
