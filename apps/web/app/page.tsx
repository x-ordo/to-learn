import Link from 'next/link';
import styles from './page.module.css';

const stats = [
  { label: '학습 지속률', value: '92%' },
  { label: '맞춤형 문제 추천', value: '1,000+' },
  { label: '챗봇 피드백 소요 시간', value: '< 5초' }
];

const features = [
  {
    icon: '📊',
    title: '맞춤형 커리큘럼',
    description:
      '학습자의 수준과 목표를 분석하여 매일 새로운 금융 학습 플랜을 제안합니다.'
  },
  {
    icon: '🤖',
    title: 'AI 문제 생성',
    description:
      'Express 기반 API와 연동되는 챗봇이 실전 감각을 살린 문제를 실시간 생성합니다.'
  },
  {
    icon: '🧭',
    title: '러닝 저니 추적',
    description:
      'sqlite에 저장된 이력을 통해 진도, 강점, 보완 영역을 한눈에 파악할 수 있습니다.'
  },
  {
    icon: '🚀',
    title: '프로 지향형 피드백',
    description:
      '실무 금융 시나리오와 연결된 피드백으로 취업 준비생과 실무자 모두에게 도움을 줍니다.'
  }
];

const workflow = [
  {
    step: 'STEP 01',
    title: '목표 설정 & 진단',
    description:
      '랜딩 페이지에서 간단한 프로필과 학습 목표를 제출하면, Express API가 진단 테스트를 실행합니다.'
  },
  {
    step: 'STEP 02',
    title: '챗봇과 학습',
    description:
      'Next.js 웹앱에서 챗봇과 대화하며 맞춤형 문제를 풀고, 즉각적인 해설과 심화 리소스를 추천받습니다.'
  },
  {
    step: 'STEP 03',
    title: '성과 리포트',
    description:
      '누적 학습 데이터는 SQLite에 저장되어 대시보드에서 성장 추이를 시각화합니다.'
  }
];

const testimonials = [
  {
    quote:
      '투런 덕분에 면접에서 금융 상품 구조를 술술 설명할 수 있게 됐어요. 챗봇이 꼬리질문까지 대비해줘서 자신감이 생겼습니다.',
    name: '이지현',
    role: '자산관리사 준비생'
  },
  {
    quote:
      '실무 데이터 기반 문제 덕분에 사내 금융 교육 시간을 크게 절약했습니다. 팀원들의 학습 현황도 한눈에 파악돼요.',
    name: '김성훈',
    role: '핀테크 스타트업 팀장'
  }
];

const navLinks = [
  { href: '#features', label: '핵심 기능' },
  { href: '#workflow', label: '서비스 흐름' },
  { href: '#stories', label: '사용자 이야기' }
];

/**
 * HomePage
 * --------
 * 정적 랜딩 페이지로, 서비스 소개/핵심 지표/플로우를 시각화하고
 * `/chat` 페이지로 진입하는 CTA를 제공합니다.
 */
export default function HomePage() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className="container">
          <div className={styles.navbar}>
            <Link href="/" className={styles.brand}>
              투런
            </Link>
            <nav className={styles.navLinks}>
              {navLinks.map((link) => (
                <a key={link.label} href={link.href} className={styles.navLink}>
                  {link.label}
                </a>
              ))}
              <Link href="/chat" className={`${styles.navLink} ${styles.navCta}`}>
                챗봇 체험
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <section className={`${styles.hero} container`}>
        <div className={styles.badge}>
          <span>AI 금융 에듀테크</span>
          <span className="gradient-text">투런</span>
        </div>
        <h1>
          개인화된 금융 학습을
          <br />
          챗봇과 함께 가장 빠르게
        </h1>
        <p>
          투런은 Express.js 기반 챗봇 엔진과 Next.js 프론트엔드를 결합해 학습자마다 다른
          금융 문제와 피드백을 제공합니다. 이제 핀테크 취업 준비부터 자격증 대비까지 한 번에
          해결하세요.
        </p>
        <div className={styles.heroCta}>
          <Link href="/chat" className={styles.primaryButton}>
            챗봇으로 시작하기
          </Link>
          <a href="#workflow" className={styles.secondaryButton}>
            학습 흐름 살펴보기
          </a>
        </div>
        <div className={styles.stats}>
          {stats.map((stat) => (
            <article key={stat.label} className={styles.statCard}>
              <h3 className="gradient-text">{stat.value}</h3>
              <p>{stat.label}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="features" className={`${styles.featureSection} container`}>
        <h2 className="gradient-text" style={{ fontSize: '2.2rem', marginBottom: '1.5rem' }}>
          혼자 공부할 때 놓치기 쉬운 부분까지 케어합니다
        </h2>
        <div className={styles.featureGrid}>
          {features.map((feature) => (
            <article key={feature.title} className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                {feature.icon}
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="workflow" className={`container ${styles.workflow}`}>
        {workflow.map((item) => (
          <article key={item.title} className={styles.workflowCard}>
            <span className={styles.workflowStep}>{item.step}</span>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{item.title}</h3>
            <p style={{ margin: 0, color: 'rgba(15, 23, 42, 0.65)' }}>{item.description}</p>
          </article>
        ))}
      </section>

      <section id="stories" className={`container`} style={{ display: 'grid', gap: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '2rem', color: '#0f172a' }}>
          사용자들이 이야기하는 투런
        </h2>
        <div className={styles.workflow}>
          {testimonials.map((testimonial) => (
            <article key={testimonial.name} className={styles.testimonial}>
              <p style={{ margin: 0, fontSize: '1.05rem' }}>{testimonial.quote}</p>
              <div className={styles.testimonialFooter}>
                <span className={styles.avatar} aria-hidden="true" />
                <div>
                  <strong>{testimonial.name}</strong>
                  <p style={{ margin: 0, color: 'rgba(15, 23, 42, 0.6)' }}>{testimonial.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={`container`}>
        <div className={styles.cta}>
          <h2 style={{ margin: 0, fontSize: '2.2rem' }}>
            챗봇과 함께하는 금융 학습의 시작을 놓치지 마세요
          </h2>
          <p style={{ margin: 0, color: 'rgba(226, 232, 240, 0.85)', maxWidth: '540px' }}>
            오늘 등록하면 챗봇이 바로 학습 목표를 분석하고, Express API와 연동된 개인화 문제
            풀기 경험을 제공합니다.
          </p>
          <div className={styles.ctaActions}>
            <Link href="/chat" className={styles.primaryButton}>
              실시간 챗봇 체험하기
            </Link>
            <a href="mailto:hello@tolearn.ai" className={`${styles.secondaryButton} ${styles.ctaSecondary}`}>
              팀 도입 문의하기
            </a>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerContent}>
            <div className={styles.footerBrand}>
              <strong>투런</strong>
              <p style={{ margin: 0 }}>
                금융 학습 플랫폼 | 문의: <a href="mailto:hello@tolearn.ai">hello@tolearn.ai</a>
              </p>
              <p style={{ margin: 0 }}>서울 기반 핀테크 팀 | 사업자등록 준비 중</p>
            </div>
            <p className={styles.footerTeam}>팀원: 박하성 · 이지혁 · 황태연</p>
            <p className={styles.footerLegal}>
              © {new Date().getFullYear()} 투런. 금융 학습의 새로운 표준을 만들고 있습니다.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
