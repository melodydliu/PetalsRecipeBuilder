'use client'
import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { FlowersTab } from './FlowersTab'
import { HardGoodsTab } from './HardGoodsTab'
import { RentalsTab } from './RentalsTab'
import type { Flower, HardGood, Rental } from '@/types/database'

interface CatalogTabsProps {
  initialFlowers: Flower[]
  initialHardGoods: HardGood[]
  initialRentals: Rental[]
}

export function CatalogTabs({ initialFlowers, initialHardGoods, initialRentals }: CatalogTabsProps) {
  const [flowers, setFlowers] = useState(initialFlowers)
  const [hardGoods, setHardGoods] = useState(initialHardGoods)
  const [rentals, setRentals] = useState(initialRentals)

  return (
    <Tabs defaultValue="flowers">
      <TabsList className="mb-6">
        <TabsTrigger value="flowers">
          Flowers
          <span className="ml-1.5 text-xs text-[#A89880]">{flowers.length}</span>
        </TabsTrigger>
        <TabsTrigger value="hard-goods">
          Hard Goods
          <span className="ml-1.5 text-xs text-[#A89880]">{hardGoods.length}</span>
        </TabsTrigger>
        <TabsTrigger value="rentals">
          Rentals
          <span className="ml-1.5 text-xs text-[#A89880]">{rentals.length}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="flowers">
        <FlowersTab flowers={flowers} onUpdate={setFlowers} />
      </TabsContent>
      <TabsContent value="hard-goods">
        <HardGoodsTab hardGoods={hardGoods} onUpdate={setHardGoods} />
      </TabsContent>
      <TabsContent value="rentals">
        <RentalsTab rentals={rentals} onUpdate={setRentals} />
      </TabsContent>
    </Tabs>
  )
}
