import { C, Code, DocHeader, H2, Table } from "../../../components/docs/Doc";

export const metadata = { title: "License" };

const MIT = `MIT License

Copyright (c) 2026 Adeyanju Fuhad

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

export default function License() {
  return (
    <>
      <DocHeader eyebrow="More" title="License">
        Astrolabe is free and open source under the MIT license. You can use it at work, change it and ship it in your
        own tools, commercially or not, as long as you keep the copyright notice.
      </DocHeader>

      <H2 id="mit">MIT license</H2>
      <Code title="LICENSE" copy={false}>
        {MIT}
      </Code>

      <H2 id="third-party">Third-party software</H2>
      <Table
        columns={["Component", "Used in", "License"]}
        rows={[
          [<C>github.com/lib/pq</C>, "The optional history server (Postgres driver). The CLI's only dependency.", "MIT"],
          ["React Bits components (Counter, Magic Bento, Tilted Card, SplitFlapText, Radar)", "This website only, adapted", "MIT + Commons Clause"],
          ["Next.js and React", "This website only", "MIT"],
        ]}
      />
      <p>
        The Astrolabe CLI and GitHub Action contain no third-party code besides the Go standard library and the
        Postgres driver above. The browser client that drives Chrome is written from scratch so there&apos;s nothing else
        to audit.
      </p>
    </>
  );
}
