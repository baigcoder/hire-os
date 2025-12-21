import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";
import { Button } from "./ui/button";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setSearchedQuery } from "@/redux/jobSlice";
import { Code2, PenTool, Database, Monitor, Palette } from "lucide-react";

const category = [
  { name: "Frontend Developer", icon: Monitor },
  { name: "Backend Developer", icon: Database },
  { name: "Data Science", icon: Code2 },
  { name: "Graphic Designer", icon: Palette },
  { name: "FullStack Developer", icon: PenTool },
];

const CategoryCarousel = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const searchJobHandler = (query) => {
    dispatch(setSearchedQuery(query));
    navigate("/browse");
  };

  return (
    <div className="w-full bg-black py-16 border-t border-white/5 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-yellow-600/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-white mb-2">
            Popular Categories
          </h2>
          <p className="text-gray-500">
            Explore opportunities in top tech domains
          </p>
        </div>

        <Carousel className="w-full max-w-4xl mx-auto">
          <CarouselContent className="-ml-4">
            {category.map((cat, index) => (
              <CarouselItem
                key={index}
                className="pl-4 md:basis-1/2 lg:basis-1/3"
              >
                <button
                  onClick={() => searchJobHandler(cat.name)}
                  className="w-full group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-6 hover:border-yellow-500/50 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/0 to-yellow-500/0 group-hover:from-yellow-500/5 group-hover:to-transparent transition-all duration-500"></div>
                  <div className="flex flex-col items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-yellow-500 group-hover:bg-yellow-500/10 transition-colors duration-300">
                      <cat.icon size={24} />
                    </div>
                    <span className="font-medium text-gray-300 group-hover:text-white transition-colors">
                      {cat.name}
                    </span>
                  </div>
                </button>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="bg-black/50 border-white/10 text-white hover:bg-yellow-500 hover:text-black hover:border-yellow-500 transition-all" />
          <CarouselNext className="bg-black/50 border-white/10 text-white hover:bg-yellow-500 hover:text-black hover:border-yellow-500 transition-all" />
        </Carousel>
      </div>
    </div>
  );
};

export default CategoryCarousel;
