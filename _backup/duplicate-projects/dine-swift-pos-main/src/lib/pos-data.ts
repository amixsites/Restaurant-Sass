import paneer from "@/assets/food-paneer.jpg";
import butter from "@/assets/food-butterchicken.jpg";
import noodles from "@/assets/food-noodles.jpg";
import mango from "@/assets/food-mango.jpg";
import lava from "@/assets/food-lavacake.jpg";
import wings from "@/assets/food-wings.jpg";
import biryani from "@/assets/food-biryani.jpg";
import coldcoffee from "@/assets/food-coldcoffee.jpg";

export type Category = "Starters" | "Main Course" | "Chinese" | "Drinks" | "Desserts";

export interface FoodItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: Category;
  veg: boolean;
  available: boolean;
}

export const categories: Category[] = ["Starters", "Main Course", "Chinese", "Drinks", "Desserts"];

export const foods: FoodItem[] = [
  {
    id: "1",
    name: "Paneer Tikka",
    description: "Smoky grilled cottage cheese cubes",
    price: 280,
    image: paneer,
    category: "Starters",
    veg: true,
    available: true,
  },
  {
    id: "2",
    name: "Crispy Chicken Wings",
    description: "Spicy fried wings with hot sauce",
    price: 320,
    image: wings,
    category: "Starters",
    veg: false,
    available: true,
  },
  {
    id: "3",
    name: "Butter Chicken",
    description: "Creamy tomato curry with naan",
    price: 420,
    image: butter,
    category: "Main Course",
    veg: false,
    available: true,
  },
  {
    id: "4",
    name: "Veg Biryani",
    description: "Aromatic basmati with vegetables",
    price: 280,
    image: biryani,
    category: "Main Course",
    veg: true,
    available: true,
  },
  {
    id: "5",
    name: "Hakka Noodles",
    description: "Wok-tossed noodles with veggies",
    price: 220,
    image: noodles,
    category: "Chinese",
    veg: true,
    available: true,
  },
  {
    id: "6",
    name: "Mango Smoothie",
    description: "Fresh alphonso mango blended",
    price: 160,
    image: mango,
    category: "Drinks",
    veg: true,
    available: true,
  },
  {
    id: "7",
    name: "Cold Coffee",
    description: "Iced coffee with vanilla scoop",
    price: 180,
    image: coldcoffee,
    category: "Drinks",
    veg: true,
    available: true,
  },
  {
    id: "8",
    name: "Chocolate Lava Cake",
    description: "Warm cake with molten center",
    price: 240,
    image: lava,
    category: "Desserts",
    veg: true,
    available: true,
  },
];
