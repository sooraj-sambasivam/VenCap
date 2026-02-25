import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('VenCap Error Boundary caught an error:', error, errorInfo)
  }

  handleTryAgain = () => {
    this.setState({ hasError: false, error: null })
  }

  handleResetGame = () => {
    try {
      localStorage.removeItem('vencap-game-state')
    } catch {
      // ignore
    }
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardContent className="pt-8 pb-6 text-center space-y-4">
              <AlertTriangle className="h-12 w-12 text-red-400 mx-auto" />
              <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred. You can try again or reset your game save.
              </p>
              {this.state.error && (
                <pre className="text-xs text-red-400/70 bg-secondary/50 rounded-lg p-3 max-h-24 overflow-auto text-left">
                  {this.state.error.message}
                </pre>
              )}
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  onClick={this.handleTryAgain}
                  className="flex-1 gap-2"
                >
                  <RotateCcw className="h-4 w-4" /> Try Again
                </Button>
                <Button
                  variant="destructive"
                  onClick={this.handleResetGame}
                  className="flex-1 gap-2"
                >
                  <Trash2 className="h-4 w-4" /> Reset Game
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
