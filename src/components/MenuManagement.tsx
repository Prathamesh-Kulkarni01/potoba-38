
import { useState } from 'react';
import {
  Edit,
  Trash2,
  PlusCircle,
  Filter,
  MoreHorizontal,
  Image
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Sample data - in a real application, this would come from an API
const categories = [
  'All',
  'Starters',
  'Main Courses',
  'Sides',
  'Desserts',
  'Drinks'
];

const menuItems = [
  { 
    id: 1, 
    name: 'Classic Burger', 
    description: 'Beef patty with lettuce, tomato, and our special sauce',
    category: 'Main Courses',
    price: 12.99,
    image: '/placeholder.svg'
  },
  { 
    id: 2, 
    name: 'Caesar Salad', 
    description: 'Romaine lettuce with Caesar dressing, croutons, and parmesan',
    category: 'Starters',
    price: 8.99,
    image: '/placeholder.svg'
  },
  { 
    id: 3, 
    name: 'Margherita Pizza', 
    description: 'Tomato sauce, mozzarella, and fresh basil',
    category: 'Main Courses',
    price: 14.99,
    image: '/placeholder.svg'
  },
  { 
    id: 4, 
    name: 'Chocolate Cake', 
    description: 'Rich chocolate cake with a molten center',
    category: 'Desserts',
    price: 6.99,
    image: '/placeholder.svg'
  },
  { 
    id: 5, 
    name: 'French Fries', 
    description: 'Crispy golden fries with sea salt',
    category: 'Sides',
    price: 4.99,
    image: '/placeholder.svg'
  },
  { 
    id: 6, 
    name: 'Iced Tea', 
    description: 'Refreshing iced tea with lemon',
    category: 'Drinks',
    price: 2.99,
    image: '/placeholder.svg'
  },
  { 
    id: 7, 
    name: 'Chicken Wings', 
    description: 'Spicy chicken wings with blue cheese dip',
    category: 'Starters',
    price: 9.99,
    image: '/placeholder.svg'
  },
  { 
    id: 8, 
    name: 'Spaghetti Carbonara', 
    description: 'Creamy pasta with bacon and parmesan',
    category: 'Main Courses',
    price: 13.99,
    image: '/placeholder.svg'
  }
];

interface MenuItemCardProps {
  item: {
    id: number;
    name: string;
    description: string;
    category: string;
    price: number;
    image: string;
  };
  onEdit: (itemId: number) => void;
}

const MenuItemCard = ({ item, onEdit }: MenuItemCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-all duration-200">
      <div className="relative h-40 bg-gray-100">
        <img 
          src={item.image} 
          alt={item.name} 
          className="w-full h-full object-cover" 
        />
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="bg-white/80 hover:bg-white rounded-full h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(item.id)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Item
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Item
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-semibold">{item.name}</h3>
            <p className="text-xs text-muted-foreground">{item.category}</p>
          </div>
          <div className="text-restaurant-primary font-semibold">${item.price.toFixed(2)}</div>
        </div>
        <p className="mt-2 text-sm text-gray-500 line-clamp-2">{item.description}</p>
      </div>
    </div>
  );
};

const MenuManagement = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  
  const filteredItems = activeCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === activeCategory);

  const handleEdit = (itemId: number) => {
    setSelectedItemId(itemId);
    setEditDialogOpen(true);
  };

  const selectedItem = menuItems.find(item => item.id === selectedItemId);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Menu Management</h1>
          <p className="text-muted-foreground">Manage your restaurant menu items</p>
        </div>
        
        <Button 
          onClick={() => setAddItemDialogOpen(true)} 
          className="bg-restaurant-primary hover:bg-restaurant-primary/90"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Menu Item
        </Button>
      </div>
      
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
        <TabsList className="w-full max-w-full h-auto flex flex-wrap">
          {categories.map((category) => (
            <TabsTrigger key={category} value={category} className="flex-grow">
              {category}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {categories.map((category) => (
          <TabsContent key={category} value={category} className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item) => (
                <MenuItemCard key={item.id} item={item} onEdit={handleEdit} />
              ))}
            </div>
            {filteredItems.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No items in this category</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
      
      {/* Edit Item Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
            <DialogDescription>
              Update the details for {selectedItem?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="itemName">Item Name</Label>
                <Input id="itemName" defaultValue={selectedItem.name} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" defaultValue={selectedItem.description} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select defaultValue={selectedItem.category}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c !== 'All').map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input id="price" type="number" step="0.01" defaultValue={selectedItem.price} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="image">Image</Label>
                <div className="flex items-center gap-4">
                  <img 
                    src={selectedItem.image} 
                    alt={selectedItem.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <Button variant="outline" className="flex-1">
                    <Image className="mr-2 h-4 w-4" />
                    Change Image
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-restaurant-primary hover:bg-restaurant-primary/90"
              onClick={() => setEditDialogOpen(false)}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Item Dialog */}
      <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Menu Item</DialogTitle>
            <DialogDescription>
              Enter the details for the new menu item
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newItemName">Item Name</Label>
              <Input id="newItemName" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newDescription">Description</Label>
              <Textarea id="newDescription" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newCategory">Category</Label>
              <Select defaultValue="Main Courses">
                <SelectTrigger id="newCategory">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter(c => c !== 'All').map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newPrice">Price ($)</Label>
              <Input id="newPrice" type="number" step="0.01" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newImage">Image</Label>
              <Button variant="outline" className="w-full">
                <Image className="mr-2 h-4 w-4" />
                Upload Image
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-restaurant-primary hover:bg-restaurant-primary/90"
              onClick={() => setAddItemDialogOpen(false)}
            >
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MenuManagement;
