/// <reference types="vite/client" />

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.xlsx' {
  const src: string;
  export default src;
}

declare module '*.xlsx?url' {
  const src: string;
  export default src;
}
