'use client';

import { useState } from 'react';
import { UtensilsCrossed, Plus, Minus, MessageSquare, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MenuCategory, MenuItem, OrderItem } from '@/types';

interface AnimatedMenuProps {
  categories: MenuCategory[];
  menuItems: MenuItem[];
  selectedItems: OrderItem[];
  onAddItem: (menuItemId: string) => void;
  onRemoveItem: (menuItemId: string) => void;
  onOpenItemDetail: (item: MenuItem) => void;
  getItemQuantity: (menuItemId: string) => number;
  getItemNote: (menuItemId: string) => string;
  getItemExcludeIngredients: (menuItemId: string) => string[];
  translations: {
    noCategories: string;
  };
}

export function AnimatedMenu({
  categories,
  menuItems,
  selectedItems,
  onAddItem,
  onRemoveItem,
  onOpenItemDetail,
  getItemQuantity,
  getItemNote,
  getItemExcludeIngredients,
  translations: t,
}: AnimatedMenuProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    categories.length > 0 ? categories[0].id : null
  );
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const getItemsForCategory = (categoryId: string) => {
    return menuItems?.filter((i) => i.categoryId === categoryId && i.isActive) || [];
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  if (!categories?.length) {
    return (
      <div className="text-center py-12 text-slate-500">
        <UtensilsCrossed className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>{t.noCategories}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {categories.map((category, categoryIndex) => {
        const categoryItems = getItemsForCategory(category.id);
        if (!categoryItems.length) return null;

        const isExpanded = expandedCategory === category.id;
        const totalInCategory = categoryItems.reduce(
          (sum, item) => sum + getItemQuantity(item.id),
          0
        );

        return (
          <div
            key={category.id}
            className="border rounded-xl overflow-hidden bg-white shadow-sm animate-fade-in"
            style={{ animationDelay: `${categoryIndex * 100}ms` }}
          >
            {/* Kategori Başlığı */}
            <button
              onClick={() => toggleCategory(category.id)}
              className={`
                w-full px-5 py-4 flex items-center justify-between
                transition-all duration-300
                ${isExpanded
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                  : 'bg-gradient-to-r from-slate-50 to-white hover:from-orange-50 hover:to-amber-50'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300
                  ${isExpanded ? 'bg-white/20' : 'bg-orange-100'}
                `}>
                  <UtensilsCrossed className={`h-5 w-5 ${isExpanded ? 'text-white' : 'text-orange-500'}`} />
                </div>
                <span className="font-semibold text-lg">{category.name}</span>
                {totalInCategory > 0 && (
                  <span className={`
                    px-2 py-0.5 rounded-full text-xs font-bold
                    ${isExpanded ? 'bg-white/20 text-white' : 'bg-orange-500 text-white'}
                  `}>
                    {totalInCategory}
                  </span>
                )}
              </div>
              <ChevronDown
                className={`h-5 w-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Kategori İçeriği */}
            <div
              className={`
                transition-all duration-500 ease-out overflow-hidden
                ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
              `}
            >
              <div className="p-4 grid gap-3 md:grid-cols-2">
                {categoryItems.map((item, itemIndex) => {
                  const qty = getItemQuantity(item.id);
                  const note = getItemNote(item.id);
                  const excludedItems = getItemExcludeIngredients(item.id);
                  const isHovered = hoveredItem === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`
                        relative flex items-center gap-3 p-3 rounded-xl border-2
                        transition-all duration-300 cursor-pointer
                        animate-menu-item-in
                        ${qty > 0
                          ? 'border-orange-300 bg-orange-50 shadow-md shadow-orange-100'
                          : isHovered
                          ? 'border-slate-300 bg-slate-50 shadow-md'
                          : 'border-transparent bg-slate-50/50 hover:bg-slate-50'
                        }
                      `}
                      style={{ animationDelay: `${itemIndex * 50}ms` }}
                      onMouseEnter={() => setHoveredItem(item.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      {/* Resim */}
                      <div
                        className={`
                          w-20 h-20 rounded-xl overflow-hidden flex-shrink-0
                          transition-all duration-300
                          ${isHovered ? 'scale-105 shadow-lg' : ''}
                        `}
                        onClick={() => onOpenItemDetail(item)}
                      >
                        {item.photoUrl ? (
                          <img
                            src={item.photoUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                            <UtensilsCrossed className="h-8 w-8 text-slate-300" />
                          </div>
                        )}
                      </div>

                      {/* İçerik */}
                      <div className="flex-1 min-w-0" onClick={() => onOpenItemDetail(item)}>
                        <p className="font-semibold text-slate-800">{item.name}</p>
                        <p className="text-sm text-slate-500 line-clamp-1">{item.description}</p>
                        {item.ingredients && item.ingredients.length > 0 && (
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            🥗 {item.ingredients.slice(0, 3).join(', ')}{item.ingredients.length > 3 ? '...' : ''}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-lg font-bold text-orange-600">
                            {item.price.toFixed(2)} ₺
                          </span>
                          {excludedItems.length > 0 && (
                            <span className="text-xs text-red-600 flex items-center gap-1 bg-red-50 px-1.5 py-0.5 rounded">
                              <X className="h-3 w-3" />
                              {excludedItems.length} çıkarılacak
                            </span>
                          )}
                          {note && (
                            <span className="text-xs text-amber-600 flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              Not var
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Miktar Kontrolleri */}
                      <div className="flex flex-col items-center gap-1">
                        <Button
                          variant={qty > 0 ? 'default' : 'outline'}
                          size="icon"
                          className={`
                            h-9 w-9 rounded-full transition-all duration-300
                            ${qty > 0 ? 'bg-orange-500 hover:bg-orange-600' : ''}
                          `}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddItem(item.id);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>

                        {qty > 0 && (
                          <>
                            <span className="font-bold text-orange-600 text-lg animate-pop-in">
                              {qty}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 rounded-full border-orange-300 text-orange-500 hover:bg-orange-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveItem(item.id);
                              }}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>

                      {/* Seçili Göstergesi */}
                      {qty > 0 && (
                        <div className="absolute -top-1 -left-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-bounce-in shadow-lg">
                          {qty}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fade-in {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes menu-item-in {
          0% { opacity: 0; transform: translateX(-20px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes pop-in {
          0% { transform: scale(0); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        @keyframes bounce-in {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out both;
        }
        .animate-menu-item-in {
          animation: menu-item-in 0.4s ease-out both;
        }
        .animate-pop-in {
          animation: pop-in 0.3s ease-out;
        }
        .animate-bounce-in {
          animation: bounce-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
