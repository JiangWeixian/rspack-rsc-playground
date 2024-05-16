const Document = (props: React.PropsWithChildren<{}>) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <link rel="icon" type="image/svg+xml" href="/vite.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        <div id="root">{props.children}</div>
      </body>
    </html>
  )
}

export default Document
