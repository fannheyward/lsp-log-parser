export interface Message {
  id: number
  name: string
  directionIcon?: string
  children?: Message[]
  tempChildren?: string[]
  type?: string
}

interface Parser {
    name: string;
    lineRegex: RegExp;
    parse(inputLines: string[]): Message[];
}

const SublimeParser: Parser = {
  name: 'Sublime LSP',
  lineRegex: /^::\s+([^ ]+)\s+([^ ]+)\s+([^:\n]+):?\s*(.*)/,
  parse (inputLines) {
    const lines = []
    let id = 1
    let message: Message = { id, name: '' }

    for (const line of inputLines) {
      const lspMatch = line.match(this.lineRegex)

      if (lspMatch) {
        message = { id: ++id, name: `(${lspMatch[2]}) ${lspMatch[3]}`, type: lspMatch[1] }

        if (lspMatch[4]) {
          message.children = [{
            id: ++id,
            name: lspMatch[4]
          }]
        }

        const direction = lspMatch[1]
        if (direction.includes('>') || direction === 'received') {
          message.directionIcon = 'mdi-email-send-outline'
        } else if (direction.includes('<')) {
          message.directionIcon = 'mdi-email-receive'
        } else {
          message.directionIcon = 'mdi-sync-alert'
        }

        lines.push(message)
      } else {
        lines.push({ id: ++id, name: line, type: 'info' })
      }
    }

    return lines
  }
}

const VSCodeParser: Parser = {
  name: 'VSCode',
  lineRegex: /^\[(Trace|Info|Error) - ([0-9:APM ]+)\] (Sending|Received) (\w+) (.+)/,
  parse (inputLines) {
    const lines = []
    let id = 1
    let message: Message = { id, name: '' }

    for (const [i, line] of inputLines.entries()) {
      const newHeaderMatch = line.match(this.lineRegex)

      if (newHeaderMatch) {
        // Process completed object first.
        if (message.name) {
          if (message.tempChildren) {
            message.children = [{ id: ++id, name: message.tempChildren.join('\n') }]
          }

          lines.push(message)
          message = { id: ++id, name: '' }
        }

        message.name = `[${newHeaderMatch[2]}] ${newHeaderMatch[5]} (${newHeaderMatch[4]})`
        message.type = newHeaderMatch[1].toLowerCase()
        const direction = newHeaderMatch[3].toLowerCase()
        if (direction === 'sending' || direction === 'received') {
          message.directionIcon = direction === 'sending' ? 'mdi-email-send-outline' : 'mdi-email-receive'
        }
      } else {
        if (!message.tempChildren) {
          message.tempChildren = []
        }

        if (!message.name) {
          throw new Error(`Message content with no parent (line ${i}.`)
        }

        message.tempChildren.push(line)
      }
    }

    if (message.name) {
      if (message.tempChildren) {
        message.children = [{ id: ++id, name: message.tempChildren.join('\n') }]
      }

      lines.push(message)
    }

    return lines
  }
}

const parsers = [SublimeParser, VSCodeParser]

export default parsers
