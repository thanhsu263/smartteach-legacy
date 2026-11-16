"use client";

import CardSwap, { Card } from "./card-swap";
import { CheckIcon, ClockIcon, GamepadIcon } from "./icons";
import { heroQuizCards } from "@/data/hero-quiz";
import styles from "./hero-quiz-deck.module.css";

export function HeroQuizDeck({ active, onOpen }: { active: boolean; onOpen: (index: number) => void }) {
  return (
    <div className={styles.wrapper} data-hero-quiz-deck="">
      <div className={styles.stack}>
        <CardSwap
          width={672}
          height={492}
          cardDistance={16.8}
          verticalDistance={40.8}
          depth={21.6}
          skewAmount={2.4}
          rotation={0}
          rotationStep={1.2}
          visibleCards={3}
          delay={5000}
          autoplay={active}
          pauseOnHover
          parallax={0.16}
          hoverSpread={0.14}
          dim={0.08}
          bounce={0.16}
          cardRadius={14}
          theme="light"
          onCardClick={onOpen}
        >
          {heroQuizCards.map((quiz) => (
            <Card key={quiz.title}>
              <div className={styles.quiz} data-tone={quiz.tone}>
                <div className={styles.bar}>
                  <b>{quiz.tone === "yellow" ? <GamepadIcon size={16} /> : <span className={styles.dot} />}{quiz.title}</b>
                  <span>Câu 08 / 15</span>
                </div>
                <div className={styles.body}>
                  <div className={styles.meta}><span>{quiz.subject}</span><b><ClockIcon size={14} />00:24</b></div>
                  <p className={styles.question}>{quiz.question}</p>
                  <div className={styles.options}>
                    {quiz.options.map((option, optionIndex) => (
                      <div key={option} className={styles.option} data-correct={optionIndex === quiz.correct ? "" : undefined}>
                        <b>{String.fromCharCode(65 + optionIndex)}</b>
                        <span>{option}</span>
                        {optionIndex === quiz.correct && <CheckIcon size={16} />}
                      </div>
                    ))}
                  </div>
                  <div className={styles.progressLabel}><span>{quiz.answered}/32 học sinh đã trả lời</span><span>{quiz.status}</span></div>
                  <div className={styles.progress}><span style={{ width: `${quiz.answered / 32 * 100}%` }} /></div>
                  <button className={styles.tryQuestion} type="button">Trả lời thử <span aria-hidden="true">↗</span></button>
                </div>
              </div>
            </Card>
          ))}
        </CardSwap>
      </div>
    </div>
  );
}
