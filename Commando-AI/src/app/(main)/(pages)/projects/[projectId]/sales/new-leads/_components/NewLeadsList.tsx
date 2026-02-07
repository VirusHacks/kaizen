"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Users, Mail, Calendar, Tag, Phone } from "lucide-react";
import { motion } from "framer-motion";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

type Props = {
  leads: Lead[];
};

export default function NewLeadsList({ leads }: Props) {
  if (leads.length === 0) {
    return (
      <Card className="bg-[#0a0a0a] border border-gray-800">
        <CardContent className="p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-[400px] gap-4"
          >
            <Users className="w-16 h-16 text-gray-600" />
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-white">
                No new leads yet
              </h3>
              <p className="text-sm text-gray-400 max-w-md">
                New leads from the last 30 days will appear here. Upload a CSV
                file to get started!
              </p>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="bg-[#0a0a0a] border border-gray-800 overflow-hidden">
        <CardHeader className="border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-purple-400" />
              <div>
                <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                  New Leads
                </CardTitle>
                <p className="text-xs text-gray-400 mt-1">
                  Recently acquired customer data
                </p>
              </div>
            </div>
            <div className="px-4 py-2 bg-[#0a0a0a] border border-gray-800 rounded-lg">
              <span className="text-sm font-semibold text-white">
                {leads.length}
              </span>
              <span className="text-xs text-gray-400 ml-1">leads</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-y-auto scrollbar-hide">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-[#0a0a0a] border-b border-gray-800">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Name
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Phone
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Tags
                  </TableHead>
                  <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">
                    Date
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead, index) => (
                  <motion.tr
                    key={lead.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.03 }}
                    className="border-b border-gray-800 group cursor-pointer transition-colors hover:bg-gray-900/50"
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold text-white">
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-sm text-white">
                          {lead.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Phone className="h-3 w-3" />
                        {lead.phone}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex gap-1.5 flex-wrap">
                        {lead.tags && lead.tags.length > 0 ? (
                          lead.tags.slice(0, 2).map((tag, tagIndex) => (
                            <Badge
                              key={tagIndex}
                              variant="outline"
                              className="text-[10px] bg-[#0a0a0a] border-gray-700 text-gray-300 px-2 py-0.5"
                            >
                              <Tag className="h-2.5 w-2.5 mr-1" />
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">No tags</span>
                        )}
                        {lead.tags && lead.tags.length > 2 && (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-[#0a0a0a] border-gray-700 text-gray-400 px-2 py-0.5"
                          >
                            +{lead.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-xs text-gray-400">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(lead.createdAt), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
