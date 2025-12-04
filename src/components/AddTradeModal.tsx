import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trade } from "@/types/trade";
import { useState, useEffect } from "react";
import { Upload } from "lucide-react";

interface AddTradeModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (trade: Omit<Trade, 'id' | 'createdAt'>) => void;
  editingTrade?: Trade | null;
  initialDate?: string;
}

export const AddTradeModal = ({ open, onClose, onSave, editingTrade, initialDate }: AddTradeModalProps) => {
  const [formData, setFormData] = useState({
    date: initialDate || new Date().toISOString().split('T')[0],
    pair: '',
    entryPrice: '',
    slPrice: '',
    fees: "",
    exitPrice: '',
    lotSize: '',
    direction: 'Buy' as 'Buy' | 'Sell',
    profit: '',
    notes: '',
    link: ''
  });

  useEffect(() => {
    if (initialDate) {
      setFormData(prev => ({ ...prev, date: initialDate }));
    }
  }, [initialDate]);

  useEffect(() => {
    if (editingTrade) {
      setFormData({
        date: editingTrade.date,
        pair: editingTrade.pair,
        entryPrice: editingTrade.entryPrice.toString(),
        slPrice: editingTrade.slPrice.toString(),
        exitPrice: editingTrade.exitPrice.toString(),
        lotSize: editingTrade.lotSize.toString(),
        direction: editingTrade.direction,
        profit: editingTrade.profit.toString(),
        notes: editingTrade.notes || '',
        fees: editingTrade.fees.toString(),
        link: editingTrade.link || '',
      });
    }
  }, [editingTrade]);


  function clearFormDatAndClose() {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      pair: '',
      entryPrice: '',
      slPrice: '',
      exitPrice: '',
      lotSize: '',
      fees: "",
      direction: 'Buy',
      profit: '',
      notes: '',
      link: ''
    });
    onClose();
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave({
      date: formData.date,
      pair: formData.pair,
      entryPrice: parseFloat(formData.entryPrice),
      slPrice: parseFloat(formData.slPrice),
      exitPrice: parseFloat(formData.exitPrice),
      fees: parseFloat(formData.fees),
      lotSize: parseFloat(formData.lotSize),
      direction: formData.direction,
      profit: parseFloat(formData.profit),
      notes: formData.notes,
      link: formData.link || '',
    });



    clearFormDatAndClose();
  };

  return (
    <Dialog open={open} onOpenChange={clearFormDatAndClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {editingTrade ? 'Edit Trade' : 'Add New Trade'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto max-h-[80vh] p-2 "
        >
          <div className="grid grid-cols-2 gap-4">


            <div>
              <Label htmlFor="pair">Pair/Symbol</Label>
              <Input
                id="pair"
                placeholder="EUR/USD"
                value={formData.pair}
                onChange={(e) => setFormData({ ...formData, pair: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="direction">Direction</Label>
              <Select
                value={formData.direction}
                onValueChange={(value: 'Buy' | 'Sell') => setFormData({ ...formData, direction: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Buy">Buy</SelectItem>
                  <SelectItem value="Sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="entry">Entry Price</Label>
              <Input
                id="entry"
                type="number"
                step="0.00001"
                placeholder="1.0650"
                value={formData.entryPrice}
                onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="exit">Exit Price</Label>
              <Input
                id="exit"
                type="number"
                step="0.00001"
                placeholder="1.0700"
                value={formData.exitPrice}
                onChange={(e) => setFormData({ ...formData, exitPrice: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="slPrice">Stop Loss Price</Label>
              <Input
                id="slPrice"
                type="number"
                step="0.01"
                placeholder="0.05"
                value={formData.slPrice}
                onChange={(e) => setFormData({ ...formData, slPrice: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="fees">Fees</Label>
              <Input
                id="fees"
                type="number"
                step="0.01"
                placeholder="0.05"
                value={formData.fees}
                onChange={(e) => setFormData({ ...formData, fees: e.target.value })}
                required
              />
            </div>



            <div >
              <Label htmlFor="profit">Profit/Loss ($)</Label>
              <Input
                id="profit"
                type="number"
                step="0.01"
                placeholder="25.00"
                value={formData.profit}
                onChange={(e) => setFormData({ ...formData, profit: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="lotSize">Lot Size</Label>
              <Input
                id="lotSize"
                type="number"
                step="0.01"
                placeholder="0.05"
                value={formData.lotSize}
                onChange={(e) => setFormData({ ...formData, lotSize: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="link">Link</Label>
            <Input
              id="link"
              type="string"
              placeholder="https//:www.google.com"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Momentum trade, strong uptrend..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button type="button" variant="secondary" onClick={clearFormDatAndClose}>
              Cancel
            </Button>
            <Button type="submit">
              {editingTrade ? 'Update Trade' : 'Add Trade'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
