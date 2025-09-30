import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Users, Calendar, BarChart3, Zap, Target, List, Kanban } from "lucide-react";
import { Link } from "wouter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/50">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold">TaskFlow</h1>
          </div>
          <Link href="/login">
            <Button className="bg-primary hover:bg-primary/90" data-testid="button-enter-app">
              앱 시작하기
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-6" data-testid="badge-version">
            v2.0 - 팀 협업의 새로운 시작
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            효율적인 프로젝트 관리와<br />
            팀 협업 솔루션
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            TaskFlow로 프로젝트를 체계적으로 관리하고, 팀원들과 실시간으로 협업하세요. 
            직관적인 인터페이스와 강력한 기능으로 생산성을 극대화하세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="bg-primary hover:bg-primary/90" data-testid="button-start-now">
                <Zap className="w-4 h-4 mr-2" />
                지금 시작하기
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" data-testid="button-view-kanban">
                <Kanban className="w-4 h-4 mr-2" />
                칸반 보드 보기
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">강력한 기능들</h2>
            <p className="text-muted-foreground text-lg">
              프로젝트 관리에 필요한 모든 도구를 한 곳에서
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <List className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>작업 관리</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  프로젝트별로 작업을 체계적으로 정리하고 우선순위를 설정하여 효율적으로 관리하세요.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Kanban className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>칸반 보드</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  직관적인 칸반 보드로 작업 흐름을 시각화하고 팀원들의 진행 상황을 한눈에 파악하세요.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>팀 협업</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  팀원들의 작업 현황을 실시간으로 공유하고 효과적으로 소통하며 협업하세요.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>미팅 관리</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  팀 미팅을 체계적으로 관리하고 참여자들과 일정을 쉽게 공유하세요.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>진행률 추적</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  프로젝트와 개별 작업의 진행률을 실시간으로 추적하고 성과를 분석하세요.
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>목표 설정</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  명확한 목표를 설정하고 달성 과정을 체계적으로 관리하여 성공을 보장하세요.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">지금 바로 시작하세요</h2>
          <p className="text-muted-foreground text-lg mb-8">
            TaskFlow와 함께 더 효율적인 프로젝트 관리를 경험해보세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="bg-primary hover:bg-primary/90" data-testid="button-get-started">
                <CheckCircle className="w-4 h-4 mr-2" />
                시작하기
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" data-testid="button-view-tasks">
                작업 목록 보기
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-12 px-4">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <Target className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">TaskFlow</span>
          </div>
          <p className="text-muted-foreground">
            © 2025 TaskFlow. 효율적인 팀 협업 솔루션.
          </p>
        </div>
      </footer>
    </div>
  );
}