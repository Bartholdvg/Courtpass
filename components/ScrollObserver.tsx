"use client"

import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import { ReactNode } from "react"

interface ScrollObserverProps {
  children: ReactNode
  delay?: number
  duration?: number
  staggerChildren?: boolean
}

export default function ScrollObserver({
  children,
  delay = 0,
  duration = 0.6,
  staggerChildren = false,
}: ScrollObserverProps) {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{
        duration,
        delay,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  )
}
